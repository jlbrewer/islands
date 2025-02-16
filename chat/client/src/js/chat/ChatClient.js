import { ChatMessage } from "./ChatMessage";
import  { ChatUtility }  from "./ChatUtility";
import { Message } from "./Message";
import  { Metadata } from "./Metadata";
import  { Participant}  from "./Participant";
import  { AttachmentInfo } from "./AttachmentInfo";
import { ClientSettings } from  "./ClientSettings";
import { iCrypto } from "../lib/iCrypto";
import * as io from "socket.io-client";
import { WildEmitter } from "./WildEmitter";
import{ FileWorker } from "../lib/FileWorker";

export class ChatClient {
    constructor(opts){
        if(!opts.version){
            throw new Error("Version required!");
        }
        this.version = opts.version;
        this.islandConnectionStatus = false;
        this.allMessagesLoaded = false;
        this.loadingMessages = false;
        this.chatSocket = null;
        this.fileSocket = null;

        // ---------------------------------------------------------------------------------------------------------------------------
        // Transport defines socket.io transport
        // can be 0: xhr, 1: websocket
        this.transport = opts.transport || 0;
        console.log(`Transport initialized to ${this.transport === 0 ? "xhr" : "websocket upgrade"}`)
        this.session = null; //can be "active", "off"
        this.newTopicPending = {};
        this.pendingTopicJoins = {};
        this.outgoingMessageQueue = {};
        this.attachmentsUploadQueue = {};
        this.setClientHandlers();
        WildEmitter.mixin(this);
    }

    /*************************************************************
     * =====  Request Response and Notidication processing ======*
     *************************************************************/
    setClientHandlers(){
        this.responseHandlers = {
            init_topic_get_token_success: this.initTopicContinueAfterTokenReceived,
            init_topic_success: this.initTopicSuccess,
            login_decryption_required: this.loginDecryptData,
            join_topic_success: this.notifyJoinSuccess,
            login_success: this.finalizeLogin,
            update_settings_success: this.onSuccessfullSettingsUpdate,
            load_more_messages_success: this.loadMoreMessagesSuccess,
            request_invite_success: this.processInviteCreated,
            request_invite_error: this.requestInviteError,
            sync_invites_success: this.syncInvitesSuccess,
            save_invite_success: this.saveInviteSuccess,
            update_invite_success: this.updateInviteSuccess,
            send_success: this.messageSendSuccess,
            del_invite_success: this.delInviteSuccess,
            boot_participant_failed: this.bootParticipantFailed,
            send_fail: this.messageSendFail,
            delete_topic_success: this.deleteTopicSuccess,
            default: this.processInvalidResponse
        };

        this.serviceMessageHandlers = {
            metadata_issue: this.processMetadataUpdate,
            meta_sync: this.processMetadataUpdate,
            u_booted: this.uWereBooted,
            whats_your_name: this.processNicknameRequest,
            my_name_response: this.processNicknameResponse,
            nickname_change_broadcast: this.processNicknameChangeNote,
            default: this.processUnknownNote
        };



        this.messageHandlers = {
            shout_message: this.processIncomingMessage,
            whisper_message: this.processIncomingMessage
        };


        this.requestHandlers = {
            new_member_joined: this.processNewMemberJoined
        };

        this.requestErrorHandlers = {
            login_error: this.loginFail,
            init_topic_error: this.initTopicFail,
            request_invite_error: this.requestInviteError,
            sync_invites_error: this.syncInvitesError,
            delete_topic_error: this.deleteTopicError,
            join_topic_error: this.joinTopicError,
            default: this.unknownError
        }
    }


    processServiceMessage(message){
        (this.serviceMessageHandlers.hasOwnProperty(message.headers.command)) ?
            this.serviceMessageHandlers[message.headers.command](message, this) :
            this.serviceMessageHandlers.default(message, this)
    }

    processServiceRecord(record, self){
        //TODO decrypt body
        console.log("New service record arrived!");
        record.body = ChatUtility.decryptStandardMessage(record.body, self.session.privateKey);
        self.emit("service_record", record)
    }

    processResponse(response){
        response = new Message(self.version, response);
        if (response.headers.error){
            this.requestErrorHandlers.hasOwnProperty(response.headers.response) ?
                this.requestErrorHandlers[response.headers.response](response, this) :
                this.requestErrorHandlers.default(response, this);
            return;
        }

        this.responseHandlers.hasOwnProperty(response.headers.response) ?
            this.responseHandlers[response.headers.response](response, this) :
            this.responseHandlers.default(response, this);
    }

    processRequest(request){
        (this.requestHandlers.hasOwnProperty(request.headers.command)) ?
            this.requestHandlers[request.headers.command](request, this) :
            this.requestErrorHandlers.default(request, this)
    }


    /**
     * Processes unknown note
     * @param note
     * @param self
     */
    processUnknownNote(note, self){
        console.log("UNKNOWN NOTE RECEIVED!\n" + JSON.stringify(note));
        self.emit("unknown_note", note);
    }


    /**************************************************
     * ======  TOPIC LOGIN AND REGISTRATION ==========*
     **************************************************/
    /**
     * Called initially on topic creation
     * @param {String} nickname
     * @param {String} topicName
     * @returns {Promise<any>}
     */
    initTopic(nickname, topicName){
        return new Promise(async (resolve, reject)=>{
            try{
                let self = this;
                nickname = String(nickname).trim();
                if (!nickname || nickname.length < 3){
                    reject("Nickname entered is invalid");
                    return;
                }

                //CREATE NEW TOPIC PENDING
                let ic = new iCrypto();
                //Generate keypairs one for user, other for topic
                ic = await ic.asym.asyncCreateKeyPair('owner-keys');
                ic = await ic.asym.asyncCreateKeyPair('topic-keys');
                ic.getPublicKeyFingerprint("owner-keys", "owner-pkfp");
                ic.getPublicKeyFingerprint("topic-keys", "topic-pkfp");
                let newTopic = {
                    ownerKeyPair: ic.get("owner-keys"),
                    topicKeyPair: ic.get("topic-keys"),
                    ownerPkfp: ic.get("owner-pkfp"),
                    topicID: ic.get("topic-pkfp"),
                    ownerNickName: nickname,
                    topicName: topicName
                };

                //Request island to init topic creation and get one-time key.
                let request = new Message(self.version);
                request.headers.command = "new_topic_get_token";
                let body = {
                    topicID: newTopic.topicID,
                    ownerPublicKey: ic.get('owner-keys').publicKey
                };
                request.set("body", body);
                self.newTopicPending[newTopic.topicID] = newTopic;
                console.log("Establishing connection");
                await this.establishIslandConnection();
                this.chatSocket.emit("request", request);
                resolve();
            }catch(err){
                throw err;
            }
        })
    }



    /**
     * New token on init topic received. Proceeding with topic creation
     * @param response
     * @param self
     */
    initTopicContinueAfterTokenReceived(response, self){

        console.log("Token received, continuing creating topic");

        let pendingTopic = self.newTopicPending[response.body.topicID];
        let token = response.body.token; // Token is 1-time disposable public key generated by server

        //Forming request
        let newTopicData = {
            topicKeyPair: pendingTopic.topicKeyPair,
            ownerPublicKey: pendingTopic.ownerKeyPair.publicKey,
        };

        let newTopicDataCipher = ChatUtility.encryptStandardMessage(JSON.stringify(newTopicData), token);

        //initializing topic settings
        let settings = self.prepareNewTopicSettings(pendingTopic.ownerNickName,
            pendingTopic.topicName,
            pendingTopic.ownerKeyPair.publicKey);

        //Preparing request
        let request = new Message(self.version);
        request.headers.command = "init_topic";
        request.headers.pkfpSource = pendingTopic.ownerPkfp;
        request.body.topicID = pendingTopic.topicID;
        request.body.settings = settings;
        request.body.ownerPublicKey = pendingTopic.ownerKeyPair.publicKey;
        request.body.newTopicData = newTopicDataCipher;

        //Sending request
        self.chatSocket.emit("request", request);
    }


    prepareNewTopicSettings(nickname, topicName, publicKey, encrypt = true){
        //Creating and encrypting topic settings:
        let settings = {
            version: version,
            membersData: {},
            soundsOn: true
        };
        if(nickname){
            let ic = new iCrypto;
            ic.asym.setKey("pubk", publicKey, "public")
                .getPublicKeyFingerprint("pubk", "pkfp");
            settings.nickname = nickname;
            settings.membersData[ic.get("pkfp")] = {nickname: nickname};
        }

        if(topicName){
            settings.topicName = topicName;
        }
        if (encrypt){
            return ChatUtility.encryptStandardMessage(JSON.stringify(settings), publicKey);
        }else {
	    return settings;
	}
    }


    initTopicSuccess(request, self){
        let data = self.newTopicPending[request.body.topicID];
        let pkfp = data.pkfp;
        let privateKey = data.privateKey;
        let nickname = data.nickname;
        self.emit("init_topic_success", {
            pkfp: data.ownerPkfp,
            nickname: data.ownerNickName,
            privateKey: data.ownerKeyPair.privateKey
        });
        delete self.newTopicPending[request.body.topicID];
    }

    async topicLogin(privateKey){
        let success = true;
        let error;

        privateKey = String(privateKey).trim();


        if(this.session && this.session.status === "active" && this.islandConnectionStatus){
            this.emit("login_success");
            return;
        }
        try{
            await this.establishIslandConnection();
            let ic = new iCrypto();
            ic.setRSAKey('pk', privateKey, "private")
                .publicFromPrivate('pk', 'pub')
                .getPublicKeyFingerprint('pub', 'pkfp')
                .createNonce('nonce')
                .bytesToHex('nonce', "noncehex");

            this.session = {
                sessionID: ic.get("noncehex"),
                publicKey : ic.get("pub"),
                privateKey : ic.get('pk'),
                publicKeyFingerprint : ic.get("pkfp"),
                status : 'off'
            };

            let body = {
                publicKey: ic.get("pub"),
                sessionID: ic.get("noncehex")
            };

            let request = new Message(self.version);
            request.set("body", body);
            request.headers.command = "init_login";
            request.headers.pkfpSource = ic.get("pkfp");
            request.signMessage(ic.get("pk"));
            this.chatSocket.emit("request", request);
        }catch(err){
            success = false;
            error = err.message;
        }

        //On error try to disconnect
        if(!success){
            try{
                await  this.terminateIslandConnection();
            }catch(err){
                console.log("ERROR terminating island connection: " + err);
            }finally{
                this.emit("login_fail", error)
            }
        }
    }

    /**
     * Islnad request to decrypt data while logging in
     * data must be in request.body.loginData and it can contain
     *    clientHSPrivateKey,
     *    TAprivateKey
     *    TAHSPrivateKey
     *
     * @param response
     * @param self
     */
    loginDecryptData(request, self){

        let decryptBlob = (privateKey, blob, lengthChars = 4)=>{
            let icn = new iCrypto();
            let symLength = parseInt(blob.substr(-lengthChars))
            let blobLength = blob.length;
            let symk = blob.substring(blobLength- symLength - lengthChars, blobLength-lengthChars );
            let cipher = blob.substring(0, blobLength- symLength - lengthChars);
            icn.addBlob("symcip", symk)
                .addBlob("cipher", cipher)
                .asym.setKey("priv", privateKey, "private")
                .asym.decrypt("symcip", "priv", "sym", "hex")
                .sym.decrypt("cipher", "sym", "blob-raw", true)
            return icn.get("blob-raw")
        };

        let encryptBlob = (publicKey, blob, lengthChars = 4)=>{
            let icn = new iCrypto();
            icn.createSYMKey("sym")
                .asym.setKey("pub", publicKey, "public")
                .addBlob("blob-raw", blob)
                .sym.encrypt("blob-raw", "sym", "blob-cip", true)
                .asym.encrypt("sym", "pub", "symcip", "hex")
                .encodeBlobLength("symcip", 4, "0", "symcipl")
                .merge(["blob-cip", "symcip", "symcipl"], "res")
            return icn.get("res");
        };

        if (!self.session){
            console.log("invalid island request");
            return;
        }

        let clientHSPrivateKey, taPrivateKey, taHSPrivateKey;
        let token = request.body.token;
        let loginData = request.body.dataForDecryption;
        let ic = new iCrypto();
        ic.asym.setKey("priv", self.session.privateKey, "private");

        //Decrypting client Hidden service key
        if (loginData.clientHSPrivateKey){
            clientHSPrivateKey = decryptBlob(self.session.privateKey, loginData.clientHSPrivateKey)
        }

        if (loginData.topicAuthority && loginData.topicAuthority.taPrivateKey){
            taPrivateKey = decryptBlob(self.session.privateKey, loginData.topicAuthority.taPrivateKey )
        }

        if (loginData.topicAuthority && loginData.topicAuthority.taHSPrivateKey){
            taHSPrivateKey = decryptBlob(self.session.privateKey, loginData.topicAuthority.taHSPrivateKey)
        }

        let preDecrypted = {};

        if (clientHSPrivateKey){
            preDecrypted.clientHSPrivateKey = encryptBlob(token, clientHSPrivateKey)
        }
        if (taPrivateKey || taHSPrivateKey){
            preDecrypted.topicAuthority = {}
        }
        if (taPrivateKey){
            preDecrypted.topicAuthority.taPrivateKey = encryptBlob(token, taPrivateKey)
        }
        if (taHSPrivateKey){
            preDecrypted.topicAuthority.taHSPrivateKey = encryptBlob(token, taHSPrivateKey)
        }

        let decReq = new Message(self.version);
        decReq.headers.pkfpSource = self.session.publicKeyFingerprint;
        decReq.body = request.body;
        decReq.body.preDecrypted = preDecrypted;
        decReq.headers.command = "login_decrypted_continue";
        decReq.signMessage(self.session.privateKey);
        console.log("Decryption successfull. Sending data back to Island");

        self.chatSocket.emit("request", decReq);
    }




    finalizeLogin(response, self){
        let metadata = Metadata.parseMetadata(response.body.metadata);
        let sharedKey = Metadata.extractSharedKey(self.session.publicKeyFingerprint,
            self.session.privateKey,
            metadata);
        let messages = self.decryptMessagesOnMessageLoad(response.body.messages);
        let settings = metadata.body.settings ? metadata.body.settings : {};
        self.session.status = "active";
        self.session.metadata = metadata.body;
        self.session.metadata.sharedKey = sharedKey;
        self.session.metadataSignature = metadata.signature;
        self.session.settings = JSON.parse(ChatUtility.decryptStandardMessage(settings, self.session.privateKey));
        self.emit("login_success", messages);
        self.checkNicknames()
    }

    checkNicknames(){
        for (let pkfp of Object.keys(this.session.metadata.participants)){
            if(!this.getMemberNickname(pkfp)){
                this.requestNickname(pkfp);
            }
        }
    }

    getMemberNickname(pkfp){
        if(!this.session || ! pkfp){
            return
        }
        let membersData = this.session.settings.membersData;
        if (membersData[pkfp]){
            return membersData[pkfp].nickname;
        }
    }

    getMemberAlias(pkfp){
        if(!this.session || !pkfp){
            return
        }
        let membersData = this.session.settings.membersData;
        if (membersData[pkfp] && membersData[pkfp].alias){
            return membersData[pkfp].alias;
        } else{
            return pkfp.substring(0, 8)
        }
    }

    deleteMemberAlias(pkfp){
        let membersData = this.session.settings.membersData;
        if (membersData[pkfp]){
            delete membersData[pkfp].alias;
        }
    }

    getMemberRepr(pkfp){
        let membersData = this.session.settings.membersData;
        if(membersData[pkfp]){
            return this.getMemberAlias(pkfp) || this.getMemberNickname(pkfp) || "Anonymous";
        }
    }


    deleteMemberData(pkfp){
        let membersData = this.session.settings.membersData;
        delete membersData[pkfp];
    }

    setMemberNickname(pkfp, nickname, settings){
        if(settings){
            settings.membersData[pkfp] = {
                joined: new Date(),
                nickname: nickname
            };
            return
        }
        if(!pkfp){
            throw new Error("Missing required parameter");
        }
        let membersData = this.session.settings.membersData;
        if (!membersData[pkfp]){
            this.addNewMemberToSettings(pkfp)
        }

        membersData[pkfp].nickname = nickname;
    }

    setMemberAlias(pkfp, alias){
        if(!pkfp){
            throw new Error("Missing required parameter");
        }
        if(!this.session){
            return
        }
        let membersData = this.session.settings.membersData;
        if (!membersData[pkfp]){
            membersData[pkfp] = {}
        }
        if(!alias){
            delete membersData[pkfp].alias
        }else{
            membersData[pkfp].alias = alias;
        }

    }

    requestNickname(pkfp){
        if(!pkfp){
            throw new Error("Missing required parameter");
        }
        let request = new Message(self.version);
        request.setCommand("whats_your_name");
        request.setSource(this.session.publicKeyFingerprint);
        request.setDest(pkfp);
        request.addNonce();
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    broadcastNameChange(){
        let self = this;
        let message = new Message(self.version);
        message.setCommand("nickname_change_broadcast");
        message.setSource(this.session.publicKeyFingerprint);
        message.addNonce();
        message.body.nickname = ChatUtility.symKeyEncrypt(self.session.settings.nickname, self.session.metadata.sharedKey);
        message.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", message);
    }

    processNicknameResponse(request, self){
        self._processNicknameResponseHelper(request, self)
    }

    processNicknameChangeNote(request, self){
        self._processNicknameResponseHelper(request, self, true)
    }

    _processNicknameResponseHelper(request, self, broadcast = false){
        console.log("Got nickname response");
        let publicKey = self.session.metadata.participants[request.headers.pkfpSource].publicKey;
        if(!Message.verifyMessage(publicKey, request)){
            console.trace("Invalid signature");
            return
        }
        let existingNickname = self.getMemberNickname(request.headers.pkfpSource);
        let memberRepr = self.getMemberRepr(request.headers.pkfpSource);
        let newNickname = broadcast ? ChatUtility.symKeyDecrypt(request.body.nickname, self.session.metadata.sharedKey) :
            ChatUtility.decryptStandardMessage(request.body.nickname, self.session.privateKey);
        newNickname = newNickname.toString("utf8");

        if( newNickname !== existingNickname){
            self.setMemberNickname(request.headers.pkfpSource, newNickname);
            self.saveClientSettings();
            if(existingNickname && existingNickname !== ""){
                self.createServiceRecordOnMemberNicknameChange(memberRepr, newNickname, request.headers.pkfpSource);
            }
        }
    }

    createServiceRecordOnMemberNicknameChange(existingName, newNickname, pkfp){
        existingName = existingName || "";
        let msg = "Member " + existingName + " (id: "  +  pkfp + ") changed nickname to: " + newNickname;
        this. createRegisterServiceRecord("member_nickname_change", msg);
    }

    createRegisterServiceRecord(event, message){
        let request = new Message(self.version);
        request.addNonce();
        request.setSource(this.session.publicKeyFingerprint);
        request.setCommand("register_service_record");
        request.body.event = event;
        request.body.message = ChatUtility.encryptStandardMessage(message,
            this.session.publicKey);
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    processNicknameRequest(request, self){
        let parsedRequest = new Message(self.version, request);
        let publicKey = self.session.metadata.participants[request.headers.pkfpSource].publicKey;
        if(!Message.verifyMessage(publicKey, parsedRequest)){
            console.trace("Invalid signature");
            return
        }
        let response = new Message(self.version);
        response.setCommand("my_name_response");
        response.setSource(self.session.publicKeyFingerprint);
        response.setDest(request.headers.pkfpSource);
        response.addNonce();
        response.body.nickname = ChatUtility.encryptStandardMessage(self.session.settings.nickname, publicKey);
        response.signMessage(self.session.privateKey);
        self.chatSocket.emit("request", response);
    }

    addNewMemberToSettings(pkfp){
        this.session.settings.membersData[pkfp] = {
            joined: new Date()
        };
    }


    async attemptReconnection(){
        console.log("Attempt reconnection called in Chat")
        await this.topicLogin(this.session.privateKey);
    }

    loadMoreMessages(lastLoadedMessageID){
        let request = new Message(self.version);
        request.headers.command = "load_more_messages";
        request.headers.pkfpSource = this.session.publicKeyFingerprint;
        request.body.lastLoadedMessageID = lastLoadedMessageID;
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    loadMoreMessagesSuccess(response, self){
        let messages = self.decryptMessagesOnMessageLoad(response.body.lastMessages);
        //self.allMessagesLoaded = response.body.lastMessages.allLoaded ||  self.allMessagesLoaded;
        self.emit("messages_loaded", messages);
        self.loadingMessages = true;
    }

    decryptMessagesOnMessageLoad(data){
        let keys = data.keys;
        let metaIDs = Object.keys(keys);
        for (let i=0;i<metaIDs.length; ++i){
            let ic = new iCrypto;
            ic.addBlob('k', keys[metaIDs[i]])
                .hexToBytes("k", "kraw")
                .setRSAKey("priv", this.session.privateKey, "private")
                .privateKeyDecrypt("kraw", "priv", "kdec");
            keys[metaIDs[i]] = ic.get("kdec");
        }

        let messages = data.messages;
        let result = [];
        for (let i=0; i<messages.length; ++i){
            let message = new ChatMessage(messages[i]);
            if(message.header.service){
                message.body = ChatUtility.decryptStandardMessage(message.body, this.session.privateKey)
            } else if(message.header.private){
                message.decryptPrivateMessage(this.session.privateKey);
            } else{
                message.decryptMessage(keys[message.header.metadataID]);
            }
            result.push(message);
        }
        return result;
    }


    logout(){
        this.chatSocket.disconnect();
        this.chatSocket.off();
        this.session = null;
        this.allMessagesLoaded = false;
    }


    haveIRightsToBoot(){
        return parseInt(this.session.metadata.participants[this.session.publicKeyFingerprint].rights) >=3
    }


    bootParticipant(pkfp){
        let self = this;
        if (!self.haveIRightsToBoot()){
            self.emit("boot_participant_fail", "Not enough rights to boot a member")
            return
        }

        let request = new Message(self.version);
        request.headers.command = "boot_participant";
        request.headers.pkfpSource = self.session.publicKeyFingerprint;
        request.headers.pkfpDest = self.session.metadata.topicAuthority.pkfp;
        request.body.pkfp = pkfp;
        request.signMessage(self.session.privateKey);
        self.chatSocket.emit("request", request);
    }


    /**
     * TODO implement method
     * Processes notification of a member deletion
     * If this note received - it is assumed, that the member was successfully deleted
     * Need to update current metadata
     * @param note
     * @param self
     */
    noteParticipantBooted(note, self){
        console.log("Note received: A member has been booted. Processing");
        let newMeta = Metadata.parseMetadata(note.body.metadata);
        self._updateMetadata(newMeta);
        let bootedNickname = this.getMemberRepr(note.body.bootedPkfp);
        this.deleteMemberData(note.body.bootedPkfp);
        this.saveClientSettings();
        self.emit("participant_booted", "Participant " + bootedNickname + " has been booted!")
    }



    bootParticipantFailed(response, self){
        console.log("Boot member failed!");
        self.emit("boot_participant_fail", response.error);
    }

    /**
     * Called on INVITEE side when new user joins a topic with an invite code
     * @param nickname
     * @param inviteCode
     * @returns {Promise}
     */
    async initTopicJoin(nickname, inviteCode) {
        let start = new Date();
        console.log("joining topic with nickname: " + nickname + " | Invite code: " + inviteCode);

        const clientSettings = new ClientSettings();
        console.log(`Preparing keys...`);
        let cryptoStart = new Date()
        let ic = new iCrypto();
        ic.asym.createKeyPair("rsa")
            .getPublicKeyFingerprint('rsa', 'pkfp')
            .addBlob("invite64", inviteCode.trim())
            .base64Decode("invite64", "invite");

        let now = new Date()
        console.log(`Keys generated in ${(now - cryptoStart) / 1000}sec. ${ (now - start) / 1000 } elapsed since beginning.`);

        let callStart = new Date()
        await this.establishIslandConnection();
        console.log(`Connection with island is established. ${(new Date() - callStart) / 1000 } Elapsed since beginning. Working crypto.`);

        let invite = ic.get("invite").split("/");
        let inviterResidence = invite[0];
        let inviterID = invite[1];
        let inviteID = invite[2];

        if (!this.inviteRequestValid(inviterResidence, inviterID, inviteID)){
            this.emit("join_topic_fail");
            throw new Error("Invite request is invalid");
        }

        this.pendingTopicJoins[inviteID] = {
	    pkfp: ic.get('pkfp'),
            publicKey: ic.get('rsa').publicKey,
            privateKey: ic.get('rsa').privateKey,
            nickname: nickname,
            inviterID: inviterID,
            inviterResidence: inviterResidence
        };

        let headers = {
            command: "join_topic",
            pkfpDest: inviterID,
            pkfpSource: ic.get('pkfp'),

        };
        let body = {
            inviteString: inviteCode.trim(),
            inviteCode: inviteID,
            destination: inviterResidence,
            invitee:{
                publicKey: ic.get('rsa').publicKey,
                nickname: nickname,
                pkfp: ic.get('pkfp')
            }
        };
        let request = new Message(self.version);
        request.set('headers', headers);
        request.set("body", body);
        request.signMessage(ic.get('rsa').privateKey);
        console.log("Sending topic join request");
        let sendStart = new Date();
        this.chatSocket.emit("request", request);
        now = new Date()
        console.log(`Request sent to island in  ${(now - sendStart) / 1000}sec. ${ (now - start) / 1000 } elapsed since beginning.`);
        let topicData = {
            newPublicKey: ic.get('rsa').publicKey,
            newPrivateKey: ic.get('rsa').privateKey,

        };
        return topicData
    }


    initSettingsOnTopicJoin(topicInfo, request){
        let privateKey = topicInfo.privateKey;
        let publicKey = topicInfo.publicKey;
        let ic = new iCrypto();
        ic.asym.setKey("pub", publicKey, "public")
            .getPublicKeyFingerprint("pub", "pkfp");
        let pkfp = ic.get("pkfp");
        let topicName = ChatUtility.decryptStandardMessage(request.body.topicName, privateKey);
        let inviterNickname = ChatUtility.decryptStandardMessage(request.body.inviterNickname, privateKey);
        let inviterPkfp = request.body.inviterPkfp;
        let settings = this.prepareNewTopicSettings(topicInfo.nickname, topicName, topicInfo.publicKey, false);

        this.setMemberNickname(inviterPkfp, inviterNickname, settings);
        this.saveClientSettings(settings, privateKey)
    }

    onSuccessfullSettingsUpdate(response, self){
        console.log("Settings successfully updated!");
        self.emit("settings_updated");
    }

    notifyJoinSuccess(request, self){
        console.log("Join successfull received!");
        let topicInfo = self.pendingTopicJoins[request.body.inviteCode];
        self.initSettingsOnTopicJoin(topicInfo, request);

	console.log("new topic pkfp: " + JSON.stringify(topicInfo));
        self.emit("topic_join_success", {
            pkfp: topicInfo.pkfp,
            nickname: topicInfo.nickname,
            privateKey: topicInfo.privateKey
        });
    }



    saveClientSettings(settingsRaw, privateKey){
        if(!settingsRaw){
            settingsRaw = this.session.settings;
        }
        if(!privateKey){
            privateKey = this.session.privateKey;
        }
        let ic = new iCrypto();
        ic.asym.setKey("privk", privateKey, "private")
            .publicFromPrivate("privk", "pub")
            .getPublicKeyFingerprint("pub", "pkfp");
        let publicKey = ic.get("pub");
        let pkfp = ic.get("pkfp");

        if(typeof settingsRaw === "object"){
            settingsRaw = JSON.stringify(settingsRaw);
        }
        let settingsEnc = ChatUtility.encryptStandardMessage(settingsRaw, publicKey);
        let headers = {
            command: "update_settings",
            pkfpSource: pkfp
        };
        let body = {
            settings: settingsEnc
        };

        let request = new Message(self.version);
        request.set("headers", headers);
        request.set("body", body);
        request.signMessage(privateKey);
        console.log("Sending update settings request");
        this.chatSocket.emit("request", request);
    }


    /**
     * Deletes entire history and metadata and logs out
     * After this operation the topic is no longer accessible
     *
     * @returns {Promise<void>}
     */
    async deleteTopic(){
        if(!this.session){
            throw new Error("User must be logged in");
        }
        let privateKey = this.session.privateKey;
        let ic = new iCrypto();
        ic.createNonce("n")
            .bytesToHex("n", "nhex");

        let headers = {
            command: "delete_topic",
            pkfpSource: this.session.publicKeyFingerprint,
            nonce: ic.get("nhex")
        };

        let request = new Message(self.version);
        request.set("headers", headers);
        request.signMessage(privateKey);
        this.chatSocket.emit("request", request);
    }

    deleteTopicSuccess(response, self){
        console.log("Delete topic successful");
        self.logout();
        self.emit("delete_topic_success")
    }

    deleteTopicError(response, self){
        console.log("Delete topic error");
        self.emit("delete_topic_error", )
    }

    /**
     * TODO implement method
     * Notifies a booted member
     * If received - it is assumed that this client was successfully booted
     * from the topic.
     * Need to conceal the topic
     * @param note
     * @param self
     */
    uWereBooted(note, self){
        console.log("Looks like I am being booted. Checking..");

        if(!Message.verifyMessage(self.session.metadata.topicAuthority.publicKey, note)){
            console.log("Probably it was a mistake");
            return;
        }

        self.session.metadata.status = "sealed";
        console.log("You have been booted");
        self.emit("u_booted", "You have been excluded from this channel.");

    }


    updateMetaOnNewMemberJoin(message, self){
        self.session.metadata = JSON.parse(message.body.metadata);
        self.emit("new_member_joined")
    }

    loginFail(response, self){
        console.log("Emiting login fail... " + response.headers.error);
        self.emit("login_fail", response.headers.error);
    }

    initTopicFail(response, self){
        console.log("Init topic fail: " + response.headers.error);
        self.emit("init_topic_error", response.headers.error);
    }

    unknownError(response, self){
        console.log("Unknown request error: " + response.headers.response);
        self.emit("unknown_error", response.headers.error);
    }

    processInvalidResponse(response, self){
        console.log("Received invalid server response");
        self.emit("invalid_response", response);
    }

    /**************************************************
     * =================== END  ===================== *
     **************************************************/

    /**************************************************
     * ========== PARTICIPANTS HANDLING   ============*
     **************************************************/

    addNewParticipant(nickname, publicKey, residence, rights){
        let ic = new iCrypto();
        ic.setRSAKey("pk", publicKey, "public")
            .getPublicKeyFingerprint("pk", "fp");

        let participant = new Participant();
        participant.set('nickname', nickname);
        participant.set('publicKey', ic.get("pk"));
        participant.set('publicKeyFingerprint', ic.get("fp"));
        participant.set('residence', residence);
        participant.set('rights', rights);
        this.session.metadata.addParticipant(participant);
        this.broadcastMetadataUpdate();
    }

    /**************************************************
     * =================== END  ===================== *
     **************************************************/

    /**************************************************
     * ================ FILE HANDLING  ================*
     **************************************************/

    /**
     * Takes list of files and uploads them
     * to the Island asynchronously.
     *
     * Resolves with list of fileInfo JSON objects.
     * @param filesAttached list of files each type of File
     * @return Promise
     */
    uploadAttachments(filesAttached, messageID, metaID){
        return new Promise(async (resolve, reject)=>{
            const self = this;

            const filesProcessed = [];

            const pkfp = self.session.publicKeyFingerprint;
            const privk = self.session.privateKey;
            const symk = self.session.metadata.sharedKey;
            const residence = self.session.metadata.participants[self.session.publicKeyFingerprint].residence;

            for (let file of filesAttached){
                console.log("Calling worker function");
                filesProcessed.push(self.uploadAttachmentDefault(file, pkfp, privk, symk, messageID, metaID, residence))
            }

            Promise.all(filesProcessed)
                .then((fileInfo)=>{
                    resolve(fileInfo)
                })
                .catch(()=>{
                    console.log("ERROR DURING UPLOAD ATTACHMENTS");
                    reject();
                })
        })
    }

    /**
     * Uploads single attachment without workers asyncronously
     *
     */
    uploadAttachmentDefault(file, pkfp, privk, symk, messageID, metaID, residence){
        let self = this;
        return new Promise((resolve, reject)=>{

            console.log(`Initializing worker...`);
            let uploader = new FileWorker(self.transport);

            let uploadComplete = (msg)=>{
                let fileInfo = new AttachmentInfo(file, residence, pkfp, metaID, privk, messageID, msg.hashEncrypted, msg.hashUnencrypted);
                resolve(fileInfo);
            };

            let uploadProgress = (msg) =>{
                //TODO implement event handling
                console.log("Upload progress: " + msg)

            };

            let logMessage = (msg)=>{
                console.log("WORKER LOG: " + msg);
            }

            let uploadError = (msg)=>{
                self.emit("upload_error", msg.data);
                reject(msg.data);
            };

            let messageHandlers = {
                "upload_complete": uploadComplete,
                "upload_progress": uploadProgress,
                "upload_error": uploadError,
                "log": logMessage
            };

            uploader.on("message", (data)=>{
                let msg = data.data;
                messageHandlers[msg.message](msg.data);
            });

            uploader.uploadFile({
                attachment: file,
                pkfp: pkfp,
                privk: privk,
                symk: symk
            })
        })
    }

    /**
     * Uploads a single attachment to the island
     * Calculates hash of unencrypted and encrypted file
     * signs both hashes
     * resolves with fileInfo object
     * @returns {Promise<any>}
     */
    uploadAttachmentWithWorker(file, pkfp, privk, symk, messageID, metaID, residence){
        return new Promise((resolve, reject)=>{
            console.log("!!!Initializing worker...");
            let uploader = new Worker("/js/fileWorker.js");

            let uploadComplete = (msg)=>{
                let fileInfo = new AttachmentInfo(file, residence, pkfp, metaID, privk, messageID, msg.hashEncrypted, msg.hashUnencrypted);
                uploader.terminate();
                resolve(fileInfo);
            };

            let uploadProgress = (msg) =>{
                //TODO implement event handling
                console.log("Upload progress: " + msg)

            };

            let logMessage = (msg)=>{
                console.log("WORKER LOG: " + msg);
            }

            let uploadError = (msg)=>{
                uploader.terminate();
                self.emit("upload_error", msg.data);
                reject(data)
            };

            let messageHandlers = {
                "upload_complete": uploadComplete,
                "upload_progress": uploadProgress,
                "upload_error": uploadError,
                "log": logMessage
            };

            uploader.onmessage = (ev)=>{
                let msg = ev.data;
                messageHandlers[msg.result](msg.data);
            };

            uploader.postMessage({
                command: "upload",
                data: {
                    attachment: file,
                    pkfp: pkfp,
                    privk: privk,
                    symk: symk
                }
            });
        })
    }



    /**
     * Downloads requested attachment
     *
     * @param {string} fileInfo - Stringified JSON of type AttachmentInfo.
     *          Must contain all required info including hashes, signatures, and link
     */
    downloadAttachment(fileInfo){
        return new Promise(async (resolve, reject)=>{
            console.log("About to download the attachment");
            try{
                let self = this;
                let privk = self.session.privateKey; //To decrypt SYM key

                //Getting public key of
                let parsedFileInfo = JSON.parse(fileInfo);

                let fileOwnerPublicKey = self.session.metadata.participants[parsedFileInfo.pkfp].publicKey;

                console.log(`Downloading with worker or sync`);
                const myPkfp = self.session.publicKeyFingerprint;
                let fileData = await self.downloadAttachmentDefault(fileInfo, myPkfp, privk, fileOwnerPublicKey, parsedFileInfo.name);
                self.emit("download_complete", {fileInfo: fileInfo, fileData: fileData});
                resolve()
            } catch (err){
                reject(err)
            }
        })

    }


    // ---------------------------------------------------------------------------------------------------------------------------
    // This is for test purposes only!
    downloadAttachmentDefault(fileInfo, myPkfp, privk, ownerPubk, fileName){
        console.log(`Downloading attachment by default`);
        let self = this;

        return new Promise(async (resolve, reject)=>{
            try{
                const downloader = new FileWorker();

                const downloadComplete = (fileBuffer)=>{
                    console.log("RECEIVED FILE BUFFER FROM THE WORKER: length: " + fileBuffer.length)
                    resolve(fileBuffer);
                };

                const downloadFailed = (err)=>{
                    console.log("Download failed with error: " + err);
                    reject(err);
                };

                const processLog = (msg) =>{
                    console.log("WORKER LOG: " + msg)
                }

                const messageHandlers = {
                    "download_complete": downloadComplete,
                    "download_failed": downloadFailed,
                    "log": processLog,
                    "file_available_locally": ()=>{
                        self.emit("file_available_locally", fileName)
                        notify("File found locally.")
                    },
                    "requesting_peer": ()=>{

                        self.emit("requesting_peer", fileName)
                        notify("Requesting peer to hand the file...")
                    }
                };


                const notify = (msg)=>{
                    console.log("FILE TRANSFER EVENT NOTIFICATION: " + msg);
                }

                const processMessage = (msg)=>{
                    messageHandlers[msg.message](msg.data)
                };

                downloader.on("message",  (ev)=>{
                    processMessage(ev.data)
                });

                downloader.on("error",  (ev)=>{
                    console.log(ev);
                    reject("Downloader worker error");
                });

                try{

                    downloader.downloadFile({
                            fileInfo: fileInfo,
                            myPkfp: myPkfp,
                            privk: privk,
                            pubk: ownerPubk
                        })
                }catch (e){
                    console.log(`Error downloading file: ${e}`);
                    throw e;
                }
            }catch (e) {

                reject(e)
            }

        })
    }


    /**************************************************
     * =================== END  ===================== *
     **************************************************/

    /**************************************************
     * ================ MESSAGE HANDLING  ============*
     **************************************************/

    prepareMessage(version, messageContent, recipientPkfp) {
        return new Promise((resolve, reject) => {
            if(version === undefined || version === "") throw new Error("Chat message initialization error: Version is required");
            let self = this;
            console.log("Preparing message: " + messageContent);
            if (!self.isLoggedIn()) {
                self.emit("login_required");
                reject();
            }
            //Preparing chat message
            let chatMessage = new ChatMessage();
            chatMessage.version = version;
            chatMessage.header.metadataID = this.session.metadata.id;
            chatMessage.header.author = this.session.publicKeyFingerprint;
            chatMessage.header.recipient = recipientPkfp ? recipientPkfp : "ALL";
            chatMessage.header.private = !!recipientPkfp;
            chatMessage.header.nickname = self.session.settings.nickname;
            chatMessage.body = messageContent;
            resolve(chatMessage);
        })
    }




    /**
     * Sends the message. Message will be visible to all topic members.
     *
     * @param {string} messageContent
     * @param {array} filesAttached Array of attached files. Should be taken straight from input field
     * @returns {Promise<any>}
     */
    shoutMessage(messageContent, filesAttached){
        return new Promise(async (resolve, reject)=>{
            try{
                let self = this;

                let attachmentsInfo;

                const metaID = self.session.metadata.id;
                const chatMessage = await self.prepareMessage(this.version, messageContent);

                if (filesAttached && filesAttached.length >0){
                    attachmentsInfo = await self.uploadAttachments(filesAttached, chatMessage.header.id, metaID);
                    for (let att of attachmentsInfo) {
                        chatMessage.addAttachmentInfo(att);
                    }
                }

                chatMessage.encryptMessage(this.session.metadata.sharedKey);
                chatMessage.sign(this.session.privateKey);

                //Preparing request
                let message = new Message(self.version);

                message.headers.pkfpSource = this.session.publicKeyFingerprint;
                message.headers.command = "broadcast_message";
                message.body.message = chatMessage.toBlob();
                let currentTime = new Date().getTime();
                message.travelLog = {};
                message.travelLog[currentTime] = "Outgoing processed on client.";
                let userPrivateKey = this.session.privateKey;
                message.signMessage(userPrivateKey);
                this.chatSocket.emit("request", message);
                resolve();
            }catch(err){
                reject(err);
            }
        });
    }

    whisperMessage(pkfp, messageContent, filesAttached){
        return new Promise(async (resolve, reject)=>{
            try{
                let self = this;

                const chatMessage = await self.prepareMessage(this.version, messageContent, pkfp);

                let keys = [self.session.publicKey];
                keys.push(self.session.metadata.participants[pkfp].publicKey);
                chatMessage.encryptPrivateMessage(keys);
                chatMessage.sign(this.session.privateKey);

                //Preparing request
                let message = new Message(self.version);
                message.headers.pkfpSource = this.session.publicKeyFingerprint;
                message.headers.pkfpDest = pkfp;
                message.headers.command = "send_message";
                message.headers.private = true;
                message.body.message = chatMessage.toBlob();
                let userPrivateKey = this.session.privateKey;
                message.signMessage(userPrivateKey);
                this.chatSocket.emit("request", message);
                resolve();
            }catch(err){
                reject(err)
            }
        })
    }

    processIncomingMessage(data, self){
        console.log("Received incoming message! ");
        let message = data.message;
        let symKey = data.key ? ChatUtility.privateKeyDecrypt(data.key, self.session.privateKey) :
            self.session.metadata.sharedKey;
        let chatMessage = new ChatMessage(message.body.message);
        let author = self.session.metadata.participants[chatMessage.header.author];
        if(!author){
            throw new Error("Author is not found in the current version of metadata!");
        }
        if(!chatMessage.verify(author.publicKey)){
            self.emit("error", "Received message with invalid signature!");
        }
        if(!chatMessage.header.private && !data.key && chatMessage.header.metadataID !== self.session.metadata.id){
            throw new Error("current metadata cannot decrypt this message");
        }

        if(chatMessage.header.private){
            chatMessage.decryptPrivateMessage(self.session.privateKey);
        }else{
            chatMessage.decryptMessage(symKey);
        }
        let authorNickname = chatMessage.header.nickname;
        let authorPkfp = chatMessage.header.author;
        let authorExistingName = self.getMemberNickname(authorPkfp);
        if(!this.nicknameAssigned(authorPkfp) ||
            authorNickname !== self.getMemberNickname(authorPkfp)){
            self.setMemberNickname(authorPkfp, authorNickname);
            self.saveClientSettings()
            self.createServiceRecordOnMemberNicknameChange(authorExistingName, authorNickname, authorPkfp)
        }
        self.emit("chat_message", chatMessage);
    }

    nicknameAssigned(pkfp){
        try{
            return this.session.settings.membersData[pkfp].hasOwnProperty("nickname");
        }catch(err){
            return false;
        }
    }

    async messageSendSuccess(response, self){
        let chatMessage = new ChatMessage(response.body.message);
        let author = self.session.metadata.participants[chatMessage.header.author];
        if(!author){
            throw new Error("Author is not found in the current version of metadata!");
        }
        if(!chatMessage.verify(author.publicKey)){
            self.emit("error", "Received message with invalid signature!");
        }
        if(!chatMessage.header.private && chatMessage.header.metadataID !== self.session.metadata.id){
            throw new Error("current metadata cannot decrypt this message");
        }

        if(chatMessage.header.private){
            chatMessage.decryptPrivateMessage(self.session.privateKey);
        }else{
            chatMessage.decryptMessage(self.session.metadata.sharedKey);
        }
        self.emit("send_success", chatMessage);
    }

    messageSendFail(response, self){
        let messageID = JSON.parse(response).body.message.header.id;
        self.emit("send_fail", self.outgoingMessageQueue[messageID]);
        delete self.outgoingMessageQueue[messageID];
    }

    isLoggedIn(){
        return this.session && this.session.status === "active"
    }

    /**************************************************
     * =================== END  ===================== *
     **************************************************/


    /**************************************************
     * ================ INVITES HANDLING  ============*
     **************************************************/


    /**
     * Sends request to topic authority to create an invite
     */
    requestInvite(){
        let ic = new iCrypto()
        ic.createNonce("n")
            .bytesToHex("n", "nhex");
        let request = new Message(self.version);
        let myNickNameEncrypted = ChatUtility.encryptStandardMessage(this.session.settings.nickname,
            this.session.metadata.topicAuthority.publicKey);
        let topicNameEncrypted = ChatUtility.encryptStandardMessage(this.session.settings.topicName,
            this.session.metadata.topicAuthority.publicKey);
        request.headers.command = "request_invite";
        request.headers.pkfpSource = this.session.publicKeyFingerprint;
        request.headers.pkfpDest = this.session.metadata.topicAuthority.pkfp;
        request.body.nickname = myNickNameEncrypted;
        request.body.topicName = topicNameEncrypted;
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    syncInvites(){
        let ic = new iCrypto();
        ic.createNonce("n")
            .bytesToHex("n", "nhex");
        let request = new Message(self.version);
        request.headers.command = "sync_invites";
        request.headers.pkfpSource = this.session.publicKeyFingerprint;
        request.headers.pkfpDest = this.session.metadata.topicAuthority.pkfp;
        request.headers.nonce = ic.get("nhex");
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    syncInvitesSuccess(response, self){
        if(Message.verifyMessage(self.session.metadata.topicAuthority.publicKey, response)){
            self.updatePendingInvites(response.body.invites);
            self.emit(response.headers.response)
        }else{
            throw new Error("invalid message");
        }
    }

    generateInvite(){
        if (!this.session || !(this.session.status ==="active")){
            this.emit("login_required");
            return;
        }
        let ic = new iCrypto();
        ic.createNonce("iid")
            .bytesToHex('iid', "iidhex");
        let body = {
            requestID: ic.get("iidhex"),
            pkfp: this.session.publicKeyFingerprint
        };

        let request = new Message(self.version);
        request.headers.command = "request_invite";
        request.set("body", body);
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }

    joinTopicError(response, self){
        console.log("Topic join error: " + response.headers.error);
        self.emit("topic_join_error", response.headers.error);
    }

    requestInviteError(response, self){
        console.log("Request invite error received: " + response.headers.error);
        self.emit("request_invite_error", response.headers.error)
    }

    syncInvitesError(response, self){
        console.log("Sync invites error received: " + response.headers.error);
        self.emit("sync_invites_error", response.headers.error)
    }

    processInviteCreated(response, self){
        self.updatePendingInvites(response.body.userInvites);
        self.emit("request_invite_success", response.body.inviteCode)
    }


    updateSetInviteeName(inviteID, name){
        this.session.settings.invites[inviteID].name = name;
        this.saveClientSettings(this.session.settings, this.session.privateKey)
    }

    saveInviteSuccess(response, self){
        self.updatePendingInvites(response.body.userInvites);
        self.emit("invite_generated", self.session.pendingInvites[response.body.inviteID])
    }

    updateInviteSuccess(response, self){
        self.updatePendingInvites(response.body.invites);
        self.emit("invite_updated")
    }

    /**
     * Given a dictionary of encrypted pending invites from history
     * decrypts them and adds to the current session
     * @param invitesUpdatedEncrypted
     */
    updatePendingInvites(userInvites){
        for(let i of userInvites){
            if(!this.session.settings.invites.hasOwnProperty(i)){
                this.session.settings.invites[i] = {}
            }
        }
        for (let i of Object.keys(this.session.settings.invites)){
            if(!userInvites.includes(i)){
                delete this.session.settings.invites[i];
            }
        }

        this.saveClientSettings(this.session.settings, this.session.privateKey);
    }

    settingsInitInvites(){
        this.session.settings.invites = {};
        this.saveClientSettings(this.session.settings, this.session.privateKey);
    }


    deleteInvite(id){
        console.log("About to delete invite: " + id);
        let request = new Message(self.version);
        request.headers.command = "del_invite";
        request.headers.pkfpSource = this.session.publicKeyFingerprint;
        request.headers.pkfpDest = this.session.metadata.topicAuthority.pkfp
        let body = {
            invite: id,
        };
        request.set("body", body);
        request.signMessage(this.session.privateKey);
        this.chatSocket.emit("request", request);
    }


    delInviteSuccess(response, self){
        console.log("Del invite success! ");
        self.updatePendingInvites(response.body.invites)
        self.emit("del_invite_success")
    }

    getPendingInvites(){
        console.log("Del invite fail! ");
        self.emit("del_invite_fail")
    }

    inviteRequestValid(inviterResidence, inviterID, inviteID){
        return (inviteID && inviteID && this.onionValid(inviterResidence))
    }





    /**************************************************
     * =================== END  ===================== *
     **************************************************/

    /**************************************************
     * ====== ISLAND CONNECTION HANDLING  ============*
     **************************************************/

    async _establishChatConnection(connectionAttempts = 7, reconnectionDelay = 8000){
        return new Promise((resolve, reject)=>{
            let self = this;
            let upgrade = this.transport === 1;
            if (self.chatSocket && self.chatSocket.connected){
                resolve();
                return;
            }

            let attempted = 0;

            function attemptConnection(){
                console.log("Attempting island connection: " + attempted);
                self.chatSocket.open()
            }

            const socketConfig = {
                reconnection: false,
                forceNew: true,
                autoConnect: false,
                pingInterval: 10000,
                pingTimeout: 5000,
            }

            socketConfig.upgrade = self.transport > 0;

            self.chatSocket = io('/chat', socketConfig);

            self.chatSocket.on('connect', ()=>{
                this.finishSocketSetup();
                console.log("Island connection established");
                this.islandConnectionStatus = true;
                this.emit("connected_to_island");
                resolve();
            });



            self.chatSocket.on("disconnect", ()=>{
                console.log("Island disconnected.");
                this.islandConnectionStatus = false;
                this.emit("disconnected_from_island");
            });

            self.chatSocket.on('connect_error', (err)=>{
                if (attempted < connectionAttempts){
                    console.log("Connection error on attempt: " + attempted + err);
                    attempted += 1;
                    setTimeout(attemptConnection, reconnectionDelay);
                } else {
                    console.log('Connection Failed');
                    reject(err);
                }

            });

            self.chatSocket.on('connect_timeout', (err)=>{
                console.log('Chat connection timeout');
                reject(err);
            });

            attemptConnection();
        })
    }

    _establishFileConnection(connectionAttempts = 7, reconnectionDelay = 8000){
        return new Promise((resolve, reject)=>{
            let self = this;
            let upgrade = this.transport === 1;
            console.log("Connecting to file socket");
            if (self.fileSocket && self.fileSocket.connected){
                console.log("File socket already connected! returning");
                resolve();
                return;
            }

            let attempted = 0;

            function attemptConnection(){
                console.log("Attempting island connection: " + attempted);
                self.fileSocket.open()
            }

            self.fileSocket = io('/file', {
                reconnection: false,
                forceNew: true,
                autoConnect: false,
                upgrade: upgrade,
                pingInterval: 10000,
                pingTimeout: 5000,
            });

            self.fileSocket.on("connect", ()=>{
                this.setupFileTransferListeners();
                console.log("File transfer connectiopn established");
                resolve()
            });

            self.fileSocket.on("connect_error", (err)=>{
                if (attempted < connectionAttempts){
                    console.log("Connection error on attempt: " + attempted + err);
                    attempted += 1;
                    setTimeout(attemptConnection, reconnectionDelay);
                } else {
                    console.log('Connection Failed');
                    reject(err);
                }
            });


            self.fileSocket.on('connect_timeout', (err)=>{
                console.log('File connection timeout');
                reject(err);
            });

            attemptConnection();
        })
    }

    async establishIslandConnection(option = "chat"){
        console.log("Establishing connection with: " + option)
        if (option === "chat") {
            return this._establishChatConnection();
        } else if (option === "file"){
            return this._establishFileConnection();
        }
    }


    async terminateIslandConnection(){
        try{
            if (this.chatSocket && this.chatSocket.connected){
                this.chatSocket.disconnect();
            }
        }catch(err){
            throw ("Error terminating connection with island: " + err);
        }
    }


    finishSocketSetup(){
        this.initChatListeners();
    }

    initChatListeners(){
        this.chatSocket.on('message', message =>{

            console.log(JSON.stringify(message));
        });


        this.chatSocket.on('request', request =>{
            console.log("Received new incoming request");
            this.processRequest(request, this)
        });

        this.chatSocket.on("response", response=>{
            this.processResponse(response, this);
        });

        this.chatSocket.on("service", message=>{
            this.processServiceMessage(message, this);
        });


        this.chatSocket.on("service_record", message=>{
            console.log("Got SERVICE RECORD!");
            this.processServiceRecord(message, this);
        });

        this.chatSocket.on("message", message=>{
            this.processIncomingMessage(message, this)
        });

        this.chatSocket.on('reconnect', (attemptNumber) => {
            console.log("Successfull reconnect client")
        });



        this.chatSocket.on('metadata_update', meta=>{
            this.processMetadataUpdate(meta);
        });

    }

    /**************************************************
     * =================== END  ===================== *
     **************************************************/



    /**************************************************
     * ========== METADATA MANIPULATION   ============*
     **************************************************/

    /**
     * Takes metadata from session variable,
     * prepares it and sends to all participants
     */
    broadcastMetadataUpdate(metadata){
        let newMetadata = this.session.metadata.toBlob(true);
        let updateRequest = {
            myBlob: newMetadata,
            topicID: this.session.metadata.topicID,
            publicKeyFingerprint: this.session.publicKeyFingerprint,
            recipients :{}
        };

        Object.keys(this.session.metadata.participants).forEach((key)=>{
            //TODO encrypt
            let encryptedMeta = newMetadata;
            let fp = this.session.metadata.participants[key].publicKeyFingerprint;
            let residence = this.session.metadata.participants[key].residence;
            updateRequest.recipients[key] = {
                residence: residence,
                metadata: newMetadata
            }
        });

        this.chatSocket.emit("broadcast_metadata_update", updateRequest);
    }


    //SHIT CODE
    processMetadataUpdate(message, self){
        if(message.headers.event === "new_member_joined"){
            self.processNewMemberJoined(message, self)
        } else if(message.headers.event === "member_booted"){
            self.noteParticipantBooted(message, self)
        }else if( message.headers.event === "u_booted"){
            this.uWereBooted(message, self)
        } else if(message.headers.event === "meta_sync"){
            self.processMetaSync(message, self)
        }
    }

            processMetaSync(message, self){
        if(!self.session){
            return;
        }
        console.log("Processing metadata sync message")
        if(message.body.metadata){
                    self._updateMetadata(Metadata.parseMetadata(message.body.metadata));
            self.emit("metadata_updated");
        }
    }

    processNewMemberJoined(request, self){
        if(!self.session){
            return;
        }
        let newMemberPkfp =  request.body.pkfp;
        let newMemberNickname =  request.body.nickname;
        self._updateMetadata(Metadata.parseMetadata(request.body.metadata));
        self.addNewMemberToSettings(newMemberPkfp);
        self.setMemberNickname(newMemberPkfp, newMemberNickname);
        self.saveClientSettings();
        self.emit("new_member_joined");
    }


            _updateMetadata(metadata){
        let self = this;
        let sharedKey = Metadata.extractSharedKey(self.session.publicKeyFingerprint,
            self.session.privateKey,
            metadata);
        self.session.metadata = metadata.body;
        self.session.metadata.sharedKey = sharedKey;
        self.session.metadataSignature = metadata.signature;
    }


    /**************************************************
     * =================== END  ===================== *
     **************************************************/


    /**************************************************
     * ========== SETTINGS UPDATES ====================*
     **************************************************/
    myNicknameUpdate(newNickName){
        if(!newNickName){
            return;
        }
        newNickName = newNickName.trim().toString("utf8");
        let settings = this.session.settings;
        if (settings.nickname === newNickName){
            return;
        }
        settings.nickname = newNickName;
        this.setMemberNickname(this.session.publicKeyFingerprint, newNickName);
        this.saveClientSettings(settings, this.session.privateKey)
        this.broadcastNameChange();
    }

    topicNameUpdate(newTopicName){
        if(!newTopicName){
            return;
        }
        newTopicName = newTopicName.trim().toString("utf8");
        let settings = this.session.settings;
        if (settings.topicName === newTopicName){
            return;
        }
        settings.topicName = newTopicName;
        this.saveClientSettings(settings, this.session.privateKey)
    }
    /**************************************************
     * =================== END  ===================== *
     **************************************************/



    /**************************************************
     * ========== UTILS   ============*
     **************************************************/

    signBlob(privateKey, blob){
        let ic = new iCrypto;
        ic.setRSAKey("pk", privateKey, "private")
            .addBlob("b", blob)
            .privateKeySign("b", "pk", "sign")
        return ic.get("sign");
    }

    verifyBlob(publicKey, sign, blob){
        let ic = new iCrypto()
        ic.setRSAKey("pubk", publicKey, "public")
            .addBlob("sign", sign)
            .addBlob("b", blob)
            .publicKeyVerify("b", "sign", "pubk", "v");
        return ic.get("v");
    }




    /**
     * Generates .onion address and RSA1024 private key for it
     */
    generateOnionService(){
        let pkraw = forge.rsa.generateKeyPair(1024);
        let pkfp = forge.pki.getPublicKeyFingerprint(pkraw.publicKey, {encoding: 'hex', md: forge.md.sha1.create()})
        let pem = forge.pki.privateKeyToPem(pkraw.privateKey);

        if (pkfp.length % 2 !== 0) {
            // odd number of characters
            pkfp = '0' + pkfp;
        }
        let bytes = [];
        for (let i = 0; i < pkfp.length/2; i = i + 2) {
            bytes.push(parseInt(pkfp.slice(i, i + 2), 16));
        }

        let onion  = base32.encode(bytes).toLowerCase() + ".onion";
        return {onion: onion, privateKey: pem};
    }

    onionAddressFromPrivateKey(privateKey){
        let ic = new iCrypto()
        ic.setRSAKey("privk", privateKey, "private")
            .publicFromPrivate("privk", "pubk")
        let pkraw = forge.pki.publicKeyFromPem(ic.get("pubk"))
        let pkfp = forge.pki.getPublicKeyFingerprint(pkraw, {encoding: 'hex', md: forge.md.sha1.create()})

        if (pkfp.length % 2 !== 0) {
            pkfp = '0' + pkfp;
        }
        let bytes = [];
                    for (let i = 0; i < pkfp.length/2; i = i + 2) {
            bytes.push(parseInt(pkfp.slice(i, i + 2), 16));
        }

        return base32.encode(bytes).toLowerCase() + ".onion";
    }


    extractFromInvite(inviteString64, thingToExtract = "all"){
        let ic = new iCrypto();
        ic.addBlob("is64", inviteString64)
            .base64Decode("is64", "is")
        let inviteParts = ic.get("is").split("/")

        let things = {
            "hsid" : inviteParts[0],
            "pkfp" : inviteParts[1],
            "inviteCode" : inviteParts[2],
            "all" : inviteParts
        };
        try{
            return things[thingToExtract]
        }catch(err){
            throw new Error("Invalid parameter thingToExtract");
        }
        }


    onionValid(candidate){
        let pattern = /^[a-z2-7]{16}\.onion$/;
        return pattern.test(candidate);
    }

    getMyResidence(){
        return this.session.metadata.participants[this.session.publicKeyFingerprint].residence;
        }

    /**************************************************
     * =================== END  ===================== *
     **************************************************/


}

