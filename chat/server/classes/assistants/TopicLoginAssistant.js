const Request = require("../objects/ClientRequest.js");
const Response = require("../objects/ClientResponse.js");
const Err = require("../libs/IError.js");
const Metadata = require("../objects/Metadata.js");
const iCrypto = require("../libs/iCrypto.js");
const ClientError = require("../objects/ClientError.js");
const Util = require("../libs/ChatUtility.js");
const Logger = require("../libs/Logger.js");

class TopicLoginAssistant{

    constructor(connectionManager = Err.required(),
                requestEmitter = Err.required(),
                historyManager = Err.required(),
                taManager = Err.required(),
                connector = Err.required(),
                clientSessionManager = Err.required()){
        this.pendingLogins = {};
        this.connectionManager = connectionManager;
        this.hm = historyManager;
        this.connector = connector;
        this.sessionManager = clientSessionManager;
        this.setHandlers();
        this.setEventsHandled();
        this.setClientErrorTypes();
        this.subscribe(requestEmitter);
        this.topicAuthorityManager = taManager;
    }


    /*********************************************
     * Handlers
     *********************************************/
    /**
     *
     * @param request
     * @param connectionId
     * @param self
     * @returns {Promise<void>}
     */
    async initLogin(request, connectionId, self) {
        const clientPkfp = request.headers.pkfpSource;
        //test
        await self.verifyLoginRequest(request);
        await self.setPendingLogin(request);
        const pendingLogin = self.getPendingLogin(request.body.sessionID);
        const metadata = pendingLogin.metadata;
        const dataForDecryption = await self.getDataForDecryption(clientPkfp, metadata, request.body.sessionID);
        if (pendingLogin.taLaunchRequired || pendingLogin.hsLaunchRequired) {
            await self.sendToClientForDecrytpion(dataForDecryption, request, connectionId);
        } else {
            await self.finalizeLogin(request, connectionId, self);
        }

    }

    async continueAfterDecryption(request, connectionId, self){
        const pendingLogin = self.getPendingLogin(request.body.sessionID);
        if(!pendingLogin){
            throw new Error("Login was not properly initialized");
        }
        const tokenPrivateKey = pendingLogin.token.privateKey;
        if (pendingLogin.hsLaunchRequired){
            const clientHSKey = Util.decryptStandardMessage(request.body.preDecrypted.clientHSPrivateKey, tokenPrivateKey);
            await self.launchClientHS(clientHSKey)
        }

        if (pendingLogin.taLaunchRequired){
            const taPkfp = pendingLogin.metadata.body.topicAuthority.pkfp;
            const taPrivateKey = Util.decryptStandardMessage(request.body.preDecrypted.topicAuthority.taPrivateKey, tokenPrivateKey);
            const taHSPrivateKey = Util.decryptStandardMessage(request.body.preDecrypted.topicAuthority.taHSPrivateKey, tokenPrivateKey);
            await self.topicAuthorityManager.launchTopicAuthority(taPrivateKey, taHSPrivateKey, taPkfp);
        }


        self.finalizeLogin(request, connectionId, self);

    }

    sendToClientForDecrytpion(dataForDecryption, request, connectionId){
        console.log("Sending to client for decryption");
        const token = this.generateDecryptionToken();
        const response = new Response("login_decryption_required", request);
        response.body.dataForDecryption = dataForDecryption;
        response.body.token = token.publicKey;
        this.getPendingLogin(request.body.sessionID).token = token;
        this.connectionManager.sendResponse(connectionId, response);
    }

    async finalizeLogin(request, connectionId, self){
        if(!self.pendingLogins[request.body.sessionID]){
            throw new Error("Login was not properly initialized");
        }
        await self.initSession(request, connectionId, self);
        const messages = await self.getLastMessages(request.headers.pkfpSource);
        //const settings = await self.getSettings(request.headers.pkfpSource);

        const response = new Response("login_success", request);
        response.body.messages = messages;
        response.body.metadata = self.pendingLogins[request.body.sessionID].metadata;
        //response.body.settings = settings;

        self.connectionManager.sendResponse(connectionId, response);

        this.deletePendingLogin(request.body.sessionID);
    }



    async getDataForDecryption(clientPkfp, metadata, sessionID){
        let taData, hsKey;

        const pendingLogin = this.getPendingLogin(sessionID);

        if (this.isTopicOwner(clientPkfp, metadata) && await this.taLaunchRequired(metadata.body.topicAuthority.pkfp)){
            console.log("TA launch required");
            const taPkfp = metadata.body.topicAuthority.pkfp;

            taData = {
                taPrivateKey: await this.topicAuthorityManager.getTopicAuthorityPrivateKey(taPkfp),
                taHSPrivateKey: await this.topicAuthorityManager.getTopicAuthorityHSPrivateKey(taPkfp)
            };

            pendingLogin.taLaunchRequired = true;
        } else {
            pendingLogin.taLaunchRequired = false;
        }

        const clientResidence = metadata.body.participants[clientPkfp].residence;
        console.log("Checking client hidden service: " + clientResidence);
        if (!await this.connector.isHSUp(clientResidence)){
            hsKey = await this.hm.getClientHSPrivateKey(clientPkfp);
            pendingLogin.hsLaunchRequired = true;
        } else {
            pendingLogin.hsLaunchRequired = false;
        }

        return {
                topicAuthority: taData,
                clientHSPrivateKey: hsKey,
        }

    }


    /*********************************************
     * ~ END Handlers ~
     *********************************************/

    /*********************************************
     * Helper functions
     *********************************************/

    async getSettings(pkfp){
        return this.hm.getClientSettings(pkfp);
    }

    async initSession(request, connectionId, self){
        self.sessionManager.createSession(request.headers.pkfpSource, connectionId, request.body.sessionID);
    }

    async getLastMessages(pkfp){
        return await this.hm.getLastMessagesAndKeys(30, pkfp)
    }

    isTopicOwner(clientPkfp, metadata){
        return metadata.body.owner === clientPkfp;
    }


    async taLaunchRequired(taPkfp) {
        return  !(this.topicAuthorityManager.isTopicAuthorityLaunched(taPkfp) &&
            await this.topicAuthorityManager.isTaHiddenServiceOnline(taPkfp));
    }

    /**
     * Assumes that topic authority is local
     * @param pkfp
     * @param self
     * @returns {Promise<{taPrivateKey: *, topicHSPrivateKey: *}>}
     */
    async getTopicAuthorityData(pkfp, self){
        let taPrivateKey = await self.hm.getTopicKey(pkfp, "taPrivateKey")
        let topicHSPrivateKey = await self.hm.getTopicKey(pkfp, "taHSPrivateKey")
        return {
            taPrivateKey: taPrivateKey,
            taHSPrivateKey: topicHSPrivateKey
        }
    }


    generateDecryptionToken(){
        const ic = new iCrypto();
        ic.asym.createKeyPair("kp", 1024);
        return ic.get("kp");
    }


    deletePendingLogin(sessionID){
        if (!this.pendingLogins.hasOwnProperty(sessionID)){
            throw new Error("Pending login not found");
        }

        delete this.pendingLogins[sessionID];
    }

    async verifyLoginRequest(request){
        const clientPublicKey = await this.hm.getOwnerPublicKey(request.headers.pkfpSource);
        Request.isRequestValid(request, clientPublicKey);
    }

    async launchClientHS(privateKey = Err.required()){
        await this.connector.createHiddenService(privateKey);
    }

    async setPendingLogin(request){
        const clientPublicKey = this.hm.getOwnerPublicKey(request.headers.pkfpSource);
        const metadata = Metadata.parseMetadata(await this.hm.getLastMetadata(request.headers.pkfpSource));
        const pendingLogin = {
            publicKey: clientPublicKey,
            metadata: metadata,
            request: request
        };

        this.pendingLogins[request.body.sessionID] = pendingLogin;
    }

    getPendingLogin(sessionID){
        if (!this.pendingLogins.hasOwnProperty(sessionID)){
            throw new Error("Pending login not found");
        }

        return this.pendingLogins[sessionID];
    }

    setEventsHandled(){
        this.eventsHandled = ["init_login", "login_decrypted_continue"]
    }

    setClientErrorTypes(){
        this.clientErrorTypes = {};
        this.eventsHandled.map((val)=>{
            this.clientErrorTypes[val] ="login_error";
        })
    }

    getErrorType(command){
        if(!this.clientErrorTypes[command]){
            throw new Error("Error tpye not found!");
        }
        return this.clientErrorTypes[command]
    }

    subscribe(requestEmitter){
        let self = this;
        self.eventsHandled.map((val)=>{
            requestEmitter.on(val, async (request, connectionId)=>{
                await self.handleRequest(request, connectionId, self);
            })
        });
    }

    setHandlers(){
        this.handlers = {
            "init_login" : this.initLogin,
            "login_decrypted_continue": this.continueAfterDecryption
        }
    }

    async handleRequest(request, connectionId, self){
        try{
            console.log("Processing login topic request");
            await this.handlers[request.headers.command](request, connectionId, self)
        }catch(err){
            //handle error
            Logger.warn("Topic login error", {
                error: err.message,
                pkfp: request.pkfp,
                connectionId: connectionId,
                stack: err.stack
            });

            try{
                let error = new ClientError(request, this.getErrorType(request.headers.command) , "Internal server error")
                this.connectionManager.sendResponse(connectionId, error);
            }catch(fatalError){
                Logger.error("Topic login assistant FATAL ERROR", {
                    connectionId: connectionId,
                    request: JSON.stringify(request),
                    error: fatalError.message,
                    context: fatalError.stack,
                    originalError: err.message
                })

            }


        }
    }

    /**
     * Given public key fingerprint of a user
     * returns whether an active session is registered on the island
     * and whether there is at list one connected client socket
     * @param pkfp
     */
    isSessionActive(pkfp){
        let session = this.activeSessions[pkfp];
        //console.log("=============ACTIVE SESSIONS: " + CircularJSON.stringify(this.activeSessions));
        if(session){
            for (let i = 0; i<session.sockets.length; ++i){
                if (session.sockets[i].connected){
                    return true;
                }
            }
        }
        return false;
    }

    /*********************************************
     * ~ End helper Functions
     *********************************************/


}

module.exports = TopicLoginAssistant;

