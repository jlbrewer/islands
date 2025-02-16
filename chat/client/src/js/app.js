//Vendors
import { iCrypto } from "./lib/iCrypto";
import { resizableInput  } from "./lib/resizable";
import '../css/main.sass';
import * as util from "./lib/dom-util";
import toastr from "./lib/toastr";
window.toastr = toastr;
import { BlockingSpinner } from "./lib/BlockingSpinner";

import { ChatClient } from  "./chat/ChatClient";

let chat;
let spinner = new BlockingSpinner()

const DAYSOFWEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let colors = ["#cfeeff", "#ffebcc", "#ccffd4", "#ccfffb", "#e6e6ff", "#f8e6ff", "#ffe6f1", "#ccefff", "#ccf1ff"]
let participantsKeys = []
//variables to create new topic
let nickname, topicName;

//Connection in progress flag
let connecting = false;

//variables to topic login
let sounds = {};
let isResizing = false;
let soundsOnOfIcons = {
    on: "/img/sound-on.png",
    off: "/img/sound-off.png"
};

let sendButtonLocked = false;
let tempName;
let recording = false;

document.addEventListener('DOMContentLoaded', event => {
    document.title = "Islands";
    console.log('initializing chat....');
    chat = new ChatClient({version: version});
    loadSounds();
    setView("auth");
    setupChatListeners(chat);

    document.querySelector('#send-new-msg').addEventListener('click', sendMessage);
    document.querySelector('#close-code-view').addEventListener('click', closeCodeView);
    document.querySelector('#new-invite').addEventListener('click', generateInvite);
    document.querySelector('#refresh-invites').addEventListener('click', refreshInvites);
    document.querySelector('#attach-file').addEventListener('change', processAttachmentChosen);
    document.querySelector('#re-connect').addEventListener('click', attemptReconnection);
    document.querySelector('#sounds-switch').addEventListener('click', switchSounds);
    document.querySelector('#re-connect').addEventListener('click', attemptReconnection);

    prepareResizer();

    let userName = util.$("#user-name");
    let topicName = util.$("#topic-name");
    userName.addEventListener("change", editMyNickname);
    topicName.addEventListener("change", editTopicName);

    util.$('#new-msg').onkeypress = function (e) {
        if (!e.ctrlKey && e.keyCode === 13) {
            event.preventDefault();
            sendMessage();
            moveCursor(e.target, "start");
            return false;
        } else if (e.ctrlKey && e.keyCode === 13) {
            e.target.value += "\n";
            moveCursor(e.target, "end");
        }
    };
    util.$('#chat_window').onscroll = processChatScroll;

    util.$('#private-key').onkeypress = async e => {
        if (e.keyCode === 13) {
            await topicLogin();
        }
    };


    enableSettingsMenuListeners();
    autoLogin();

});


window.onfocus = function(){
    if (chat !== undefined && chat.isLoggedIn()){
        document.title = chat.session.settings.topicName + " | Islands";
    }
}


function prepareResizer() {
    let resizer = util.$("#chat-resizer");

    let chatWrapper = util.$("#chat_room");
    let usersList = chatWrapper.children[0];
    let chatArea = chatWrapper.children[2];


    document.addEventListener('mousedown', (e)=>{
        if (e.target === resizer){
           isResizing = true;
        }
    });

    document.addEventListener("mousemove", (e)=>{
        if(!isResizing){
            return false
        }

        let containerOffsetLeft = chatWrapper.offsetLeft;
        let pointerRelativeXpos = e.clientX - containerOffsetLeft;
        let usersListMinWidth = 300;
        usersList.style.width = (Math.max(usersListMinWidth, pointerRelativeXpos - 8)) + 'px';
        usersList.style.flexGrow = 0

    });

    document.addEventListener("mouseup", (e)=>{
        isResizing = false;
    })
}
function autoLogin(){
    console.log("In autologin")
    let url = new URL(window.location.href);
    console.log("URL is " + url);
    console.log("search params func: " + url.searchParams.get)
    let id = url.searchParams.get("id");
    console.log("After searching id")
    if(!id) return;
    let token = url.searchParams.get("token");
    console.log("Got token: " + token);
    let pkcipher = localStorage.getItem(id);
    if (!pkcipher){
        console.log("Autologin failed: no private ley found in local storage");
        document.location.href = document.location.origin;
        toastr.warning("Login required.")
        return;
    }

    let ic = new iCrypto()
    ic.addBlob("pkcip", pkcipher)
        .addBlob("key", token)
        .AESDecrypt("pkcip", "key", "privk", true, "CBC", "utf8")
    let privateKey = ic.get("privk");

    chat.topicLogin(privateKey)
        .then(()=>{
        })
        .catch(()=>{});

    localStorage.removeItem(id);

}

function loadSounds() {
    let sMap = {
        "incoming_message": "message_incoming.mp3",
        "message_sent": "message_sent.mp3",
        "user_online": "user_online.mp3"
    };

    for (let s of Object.keys(sMap)) {
        sounds[s] = new Audio("/sounds/" + sMap[s]);
        sounds[s].load();
    }
}

function playSound(sound) {
    if (chat.session.settings.soundsOn) {
        sounds[sound].play();
    }
}

function moveCursor(el, pos) {
    if (pos === "end") {
        moveCursorToEnd(el);
    } else if (pos === "start") {
        moveCursorToStart(el);
    }
}

function moveCursorToEnd(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        let range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}

function moveCursorToStart(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = 0;
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        let range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}

function createTopic() {

    let nicknameEl = document.querySelector('#new-topic-nickname');
    let topicNameEl = document.querySelector('#new-topic-name');
    nickname = nicknameEl.value.trim();
    topicName = topicNameEl.value.trim();
    loadingOn();
    chat.initTopic(nickname, topicName).then(data => {
        nicknameEl.value = "";
        topicNameEl.value = "";
    }).catch(err => {
        loadingOff();
        throw err;
    });
}

async function topicLogin() {
    loadingOn();
    console.log("called topic login");
    let privKey = document.querySelector('#private-key').value;
    clearLoginPrivateKey();
    await chat.topicLogin(privKey);
}



function setupChatListeners(chat) {
    chat.on("init_topic_success", data => {
        loadingOff();
        displayNewTopicData(data);
    });
    chat.on("init_topic_error", err => {
        let msg;
        if (err instanceof Error) {
            msg = err.message;
        } else {
            msg = err;
        }
        loadingOff();
        toastr.error("Topic was not created. Error: " + msg);
    });

    chat.on("login_success", messages => {
        document.querySelector('#sounds-switch').src = chat.session.settings.soundsOn ? soundsOnOfIcons.on : soundsOnOfIcons.off;
        loadingOff();
        clearAllInputs();
        processLogin(messages);
        playSound("user_online");
        toastr.success("You are now online!");
        document.title = chat.session.settings.topicName + " | Islands";
    });

    chat.on("unknown_error", err => {
        console.log("unknown_error emited by chat: " + err);
        toastr.error("Chat error: " + err);
	loadingOff();
	lockSend(false);
	util.$("#new-msg").focus();

    });

    chat.on("login_fail", err => {
        clearLoginPrivateKey();
        loadingOff();
        connecting = false;
        console.log("Login fail emited by chat: " + err);
        toastr.error("Login fail: " + err);
    });

    chat.on('request_invite_success', inviteID => {
        buttonLoadingOff(document.querySelector("#new-invite"));
        showInviteCode(inviteID);
    });

    chat.on('invite_updated', () => {
        toastr.info("Invite updated!");
    });

    chat.on("new_member_joined", data => {
        processNewMemberJoin(data);
    });

    chat.on("settings_updated", () => {
        updateParticipants();
        syncPendingInvites();
        updateLoadedMessages();
    });

    chat.on("participant_booted", message => {
        updateParticipants();
        toastr.info(message);
    });

    chat.on("metadata_updated", () => {
        updateParticipants();
        updateLoadedMessages();
    });

    chat.on("boot_participant_success", message => {
        updateParticipants();
        toastr.info(message);
    });

    chat.on("u_booted", message => {
        toastr.warning(message);
    });

    chat.on("boot_participant_fail", message => {
        toastr.warning("Participant booting failed: " + message);
    });


    chat.on("del_invite_fail", () => {
        toastr.warning("Error deleting invite");
    });

    chat.on("del_invite_success", () => {
        syncPendingInvites();
        toastr.info("Invite has been deleted");
    });

    chat.on("chat_message", data => {
        processIncomingMessage(data);
        playSound("incoming_message");
    });

    chat.on("send_success", message => {
        playSound("message_sent");
        messageSendSuccess(message);
    });

    chat.on("send_fail", message => {
        messageSendFail(message);
    });

    chat.on("service_record", record => {
        processServiceRecord(record);
    });

    chat.on("sync_invites_success", () => {
        refreshInvitesSuccess();
    });



    chat.on("sync_invites_error", msg => {
        buttonLoadingOff(document.querySelector('#refresh-invites'));
        toastr.warning("Invite request failed: " + msg);
    });

    chat.on("request_invite_error", msg => {
        buttonLoadingOff(document.querySelector('#new-invite'));
        toastr.warning("Invite request failed: " + msg);
    });

    chat.on("messages_loaded", messages => {
        processMessagesLoaded(messages);
    });

    chat.on("connected_to_island", () => {
        connecting = false;
        lockSend();
        switchConnectionStatus(0);
    });

    chat.on("disconnected_from_island", () => {
        switchConnectionStatus(1);
        lockSend();
        setTimeout(attemptReconnection, 1000);
    });


    chat.on("download_complete", res => {
        let fileInfo = JSON.parse(res.fileInfo);
        let fileData = res.fileData;
        if (/audio/.test(fileInfo.type)) {
            loadAudio(fileInfo, fileData);
        } else {
            downloadAttachment(fileInfo.name, fileData);
        }
    });

    //file events
    chat.on("file_available_locally", (fileName)=>{
        appendEphemeralMessage(fileName + " file available locally. Downloading...")
    })

    chat.on("requesting_peer", (fileName)=>{
        appendEphemeralMessage(fileName + " file not found locally. Requesting peer...")
    })


}

function processIncomingMessage(message) {
    let pkfp = message.header.author;
    let storedNickname = chat.getMemberNickname(pkfp);
    if (storedNickname !== message.header.nickname) {
        chat.setMemberNickname(pkfp, message.header.nickname);
        storedNickname = chat.getMemberNickname(pkfp);
        chat.saveClientSettings(chat.session.publicKeyFingerprint);
    }
    let alias = chat.getMemberAlias(pkfp);
    let timestamp = message.header.timestamp;
    appendMessageToChat({
        nickname: storedNickname,
        alias: alias,
        timestamp: timestamp,
        pkfp: pkfp,
        body: message.body,
        messageID: message.header.id,
        private: message.header.private,
        recipient: message.header.recipient,
        attachments: message.attachments
    });
    if(document.hidden){
        document.title = "* " + chat.session.settings.topicName + " | Islands"
    }
    toastr["info"]("New message from " + chat.getMemberRepr(pkfp));
}

function processServiceRecord(record) {
    let timestamp = record.header.timestamp;
    let pkfp = record.header.author;
    appendMessageToChat({
        nickname: "Service",
        timestamp: timestamp,
        messageID: record.header.id,
        pkfp: "service",
        body: record.body,
        service: record.header.service,
        attachments: record.attachments
    });
}

function sendMessage() {
    ensureConnected();
    if (sendButtonLocked) {
        return;
    }
    lockSend(true);
    let message = document.querySelector('#new-msg');
    let attachments = document.querySelector('#attach-file').files;
    let addresseeSelect = document.querySelector("#select-member");
    let addressee = addresseeSelect[addresseeSelect.selectedIndex].value;

    if (message.value.trim() === "" && attachments.length === 0) {
        lockSend(false);
        return;
    }

    if (addressee === "ALL") {
        chat.shoutMessage(message.value.trim().substring(0, 65536), attachments).then(() => {
            console.log("Send message resolved");
        }).catch(err => {
            appendEphemeralMessage("Error sending message: " + err);
            lockSend(false);
        });
    } else {
        chat.whisperMessage(addressee, message.value.trim().substring(0, 65536)).then(() => {
            console.log("Done whispering message!");
        }).catch(err => {
            appendEphemeralMessage("Error sending message: " + err.message);
            lockSend(false);
        });
    }

    message.value = "";
}

function messageSendSuccess(message) {
    let pkfp = message.header.author;
    let nickname = chat.getMemberNickname(pkfp) || message.header.nickname;

    let timestamp = message.header.timestamp;

    appendMessageToChat({
        nickname: nickname,
        timestamp: timestamp,
        pkfp: pkfp,
        body: message.body,
        messageID: message.header.id,
        attachments: message.attachments,
        private: message.header.private,
        recipient: message.header.recipient
    });
    clearAttachments();
    clearOldMessages();

    lockSend(false);
    util.$("#new-msg").focus();
}

function clearOldMessages(){
    let chatWindow = util.$("#chat_window");
    if (chatWindow.childElementCount >= 70){
        for (let i=0; i<20; i++){
            chatWindow.removeChild(chatWindow.firstElementChild);
        }
    }

}

function messageSendFail(message) {
    console.log("Message send fail");
    lockSend(false);
}

function get_current_time() {
    let d = new Date();
    return padWithZeroes(2, d.getHours()) + ':' + padWithZeroes(2, d.getMinutes());
}

function getChatFormatedDate(timestamp) {
    let d = new Date(timestamp);
    let today = new Date();
    if (Math.floor((today - d) / 1000) <= 64000) {
        return d.getHours() + ':' + padWithZeroes(2, d.getMinutes());
    } else {
        return DAYSOFWEEK[d.getDay()] + ", " + d.getMonth() + "/" + padWithZeroes(2, d.getDate()) + " " + padWithZeroes(2, d.getHours()) + ':' + padWithZeroes(2, d.getMinutes());
    }
}

function padWithZeroes(requiredLength, value) {
    let res = "0".repeat(requiredLength) + String(value).trim();
    return res.substr(res.length - requiredLength);
}

function isMyMessage(pkfp) {
    return chat.session.publicKeyFingerprint === pkfp;
}

function processNewMemberJoin() {
    if (!chat.session) {
        console.log("Not logged in, nothing to update");
        return;
    }
    console.log("NEW MEMBER JOINED. UPDATING INFO");
    updateParticipants();
    syncPendingInvites();
    toastr.info("New member just joined the channel!");
}

function bootParticipant(event) {
    console.log("About to boot participant");
    ensureConnected();
    let participantPkfp = event.target.parentElement.parentElement.lastElementChild.innerHTML;
    let participant = chat.session.settings.membersData[participantPkfp];

    if (participantPkfp == chat.session.publicKeyFingerprint) {
        if (confirm("Are you sure you want to leave this topic?")) {
            console.log("Leaving topic");
            return;
        }
    }

    let name = chat.getMemberRepr(participantPkfp);
    if (confirm("Are you sure you want to boot " + name + "? ")) {
        chat.bootParticipant(participantPkfp);
    }
}

function addParticipantToSettings(key) {
    let userRights = chat.session.metadata.participants[chat.session.publicKeyFingerprint].rights;
    let records = document.querySelector("#participants-records");
    let participant = chat.session.metadata.participants[key];
    if (!participant) {
        console.error("Error adding participant");
        return;
    }

    let wrapper = document.createElement("div");
    let id = document.createElement("div");
    let nickname = document.createElement("div");
    let rights = document.createElement("div");
    let actions = document.createElement("div");
    let delButton = document.createElement("div");

    id.setAttribute("class", "participant-id");
    wrapper.setAttribute("class", "participant-wrapper");
    nickname.setAttribute("class", "p-nickname");
    rights.setAttribute("class", "p-rights");
    actions.setAttribute("class", "p-actions");
    delButton.setAttribute("class", "boot-participant");
    delButton.addEventListener("click", bootParticipant);

    nickname.innerHTML = chat.getMemberRepr(key);
    rights.innerHTML = participant.rights;
    delButton.innerHTML = "Boot";
    id.innerHTML = key;
    wrapper.appendChild(id);
    wrapper.appendChild(nickname);
    wrapper.appendChild(rights);
    if (userRights === 3){
        actions.appendChild(delButton);
    }
    wrapper.appendChild(actions);
    wrapper.appendChild(id);
    records.appendChild(wrapper);
}

function updateParticipants() {
    util.html('#online-users-list', "");
    util.html('#participants-records', "");
    util.html('#participants--topic-name', "Topic: " + chat.session.settings.topicName);

    let mypkfp = chat.session.publicKeyFingerprint;
    participantsKeys = Object.keys(chat.session.metadata.participants).filter(val => {
        return val !== mypkfp;
    });



    let recipientChoice = document.querySelector("#select-member");
    let selectedMember = recipientChoice.value;
    let defaultRecipient = document.createElement("option");
    defaultRecipient.setAttribute("value", "ALL");
    defaultRecipient.innerText = "All";
    recipientChoice.innerHTML = "";
    recipientChoice.appendChild(defaultRecipient);

    for (let pkfp of participantsKeys) {
        addParticipantToSettings(pkfp);
        let participantId = document.createElement("span");
        participantId.classList.add("online-user-id");
        participantId.innerText = pkfp;
        let status = document.createElement("img");
        status.classList.add("participant-status");
        status.setAttribute("src", "/img/online.png");

        let pName = document.createElement("input");

        pName.value = chat.getMemberAlias(pkfp) || chat.getMemberNickname(pkfp) || "Anonymous";
        pName.addEventListener("change", participantAliasChange);
        pName.classList.add("participant-alias");

        let pRow = document.createElement("div");
        pRow.classList.add("online-user-row");
        pRow.appendChild(participantId);
        pRow.appendChild(status);
        pRow.appendChild(pName);

        if (chat.getMemberAlias(pkfp)) {
            let chosenName = document.createElement("span");
            chosenName.innerText = "(" + (chat.getMemberNickname(pkfp) || "Anonymous") + ")";
            pRow.appendChild(chosenName);
        }

        document.querySelector("#online-users-list").appendChild(pRow);

        //Adding to list of recipients
        let recipientOption = document.createElement("option");
        recipientOption.setAttribute("value", pkfp);
        recipientOption.innerText = pName.value + " (" + chat.getMemberNickname(pkfp) + ")";
        recipientChoice.appendChild(recipientOption);
    }


    if (selectedMember !== "ALL"){
        for (let pkfp of participantsKeys){
            if(pkfp === selectedMember){
                recipientChoice.value = selectedMember;
                break;
            }
        }
    }

    let participantsRecords = document.querySelector("#participants-records");
    if (participantsRecords.children.length > 0) {
        participantsRecords.lastChild.classList.add("participant-wrapper-last");
    }
}

function updateLoadedMessages() {

    document.querySelector("#chat_window").childNodes.forEach(msg => {
        if (msg.classList.contains("service-record")) {
            return;
        } else if (msg.classList.contains("my_message")) {
            if (!msg.classList.contains("private-message")) {
                return;
            }
            try {
                let heading = msg.firstChild;
                let pkfp = heading.querySelector(".m-recipient-id").innerHTML;
                heading.querySelector(".private-mark").innerText = "(private to " + chat.getMemberAlias(pkfp) + ")";
            } catch (err) {
                console.error(err);
            }
        } else {
            try {
                let heading = msg.firstChild;
                let pkfp = heading.querySelector(".m-author-id").innerHTML;
                heading.querySelector(".m-alias").innerText = chat.getMemberAlias(pkfp);
            } catch (err) {
                console.error(err);
            }
        }
    });
}

function processLogin(messages) {
    setView("chat");

    let userName = util.$('#user-name');
    let topicName = util.$("#topic-name");
    util.$("#user-id").innerText = "Your id: " + chat.session.publicKeyFingerprint;

    userName.value = chat.session.settings.nickname;
    topicName.value = chat.session.settings.topicName;

    resizableInput(userName, 13);
    resizableInput(topicName, 13);

    console.log("USER PKFP: " + chat.session.publicKeyFingerprint);
    if (chat.session.metadata.topicName) document.title = chat.session.metadata.topicName;
    updateParticipants();
    setNavbarListeners();
    syncPendingInvites();
    onLoginFillParticipants();
    onLoginLoadMessages(messages);
}

function processMessagesLoaded(messages) {
    while (messages.length > 0) {
        let message = messages.shift();
        try {
            message = typeof message === "string" ? JSON.parse(message) : message;
        } catch (err) {
            console.log("Could not parse json. Message: " + messages[messages.length - i - 1]);
            continue;
        }
        let authorPkfp = message.header.author;
        let alias = isMyMessage(authorPkfp) ? chat.getMemberNickname(authorPkfp) : chat.getMemberRepr(authorPkfp);
        appendMessageToChat({
            nickname: message.header.nickname,
            alias: alias,
            body: message.body,
            timestamp: message.header.timestamp,
            pkfp: message.header.author,
            service: message.header.service,
            private: message.header.private,
            recipient: message.header.recipient,
            messageID: message.header.id,
            attachments: message.attachments
        }, true);
    }
}

function processLogout() {
    console.log("Processing logout");
    document.querySelector('#chat_window').innerHTML = "";
    chat.logout();
    document.location = "/";
    toastr["info"]("You have successfully logged out!");
}

function setNavbarListeners() {
    util.$('#chat-view-button').onclick = () => {
        setView("chat");
    };
    util.$('#settings-view-button').onclick = () => {
        setView("settings");
    };

    util.$('#logout-button').onclick = () => {
        processLogout();
    };
}

function onLoginLoadMessages(messages) {
    document.querySelector("#chat_window").innerHTML = "";
    for (let i = 0; i < messages.length; ++i) {
        let message;
        try {
            message = typeof messages[messages.length - i - 1] === "string" ? JSON.parse(messages[messages.length - i - 1]) : messages[messages.length - i - 1];
        } catch (err) {
            console.log("Could not parse json. Message: " + messages[messages.length - i - 1]);
            continue;
        }
        const pkfp = message.header.author;
        const alias = isMyMessage(pkfp) ? chat.getMemberNickname(pkfp) : chat.getMemberRepr(pkfp);

        appendMessageToChat({
            nickname: message.header.nickname,
            alias: alias,
            body: message.body,
            timestamp: message.header.timestamp,
            pkfp: message.header.author,
            messageID: message.header.id,
            service: message.header.service,
            private: message.header.private,
            recipient: message.header.recipient,
            attachments: message.attachments
        });
    }
}

function onLoginFillParticipants() {}

/**
 * Appends message onto the chat window
 * @param message: {
 *  nickname: nickname
 *  body: body
 *  pkfp: pkfp
 * }
 */
function appendMessageToChat(message, toHead = false) {
    let chatWindow = document.querySelector('#chat_window');
    let msg = document.createElement('div');
    let message_id = document.createElement('div');
    let message_body = document.createElement('div');

    message_body.classList.add('msg-body');
    let message_heading = buildMessageHeading(message);

    if (isMyMessage(message.pkfp)) {
        // My message
        msg.classList.add('my_message');
    } else if (message.service) {
        msg.classList.add('service-record');
    } else {
        //Not my Message
        msg.classList.add('message');
        let author = document.createElement('div');
        author.classList.add("m-author-id");
        author.innerHTML = message.pkfp;
        msg.style.backgroundColor = colors[participantsKeys.indexOf(message.pkfp) % colors.length];
        message_heading.appendChild(author);
    }
    if (message.private) {
        let privateMark = preparePrivateMark(message);
        message_heading.appendChild(privateMark);
        msg.classList.add('private-message');
    }

    message_id.classList.add("message-id");
    message_id.innerHTML = message.messageID;
    message_heading.appendChild(message_id);
    message_body.appendChild(processMessageBody(message.body));
    //msg.innerHTML = '<b>'+message.author +'</b><br>' + message.message;

    //processing attachments
    let attachments = processAttachments(message.attachments);
    msg.appendChild(message_heading);
    msg.appendChild(message_body);
    if (attachments !== undefined) {
        msg.appendChild(attachments);
    }

    if (toHead) {
        chatWindow.insertBefore(msg, chatWindow.firstChild);
    } else {
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

function buildMessageHeading(message) {
    let message_heading = document.createElement('div');
    message_heading.classList.add('msg-heading');

    let alias, aliasNicknameDevisor;
    if (message.alias) {
        alias = document.createElement("b");
        alias.classList.add("m-alias");
        alias.innerText = message.alias;
        aliasNicknameDevisor = document.createElement("span");
        aliasNicknameDevisor.innerText = "  --  ";
    }

    let nickname = document.createElement("b");
    nickname.innerText = message.nickname;
    nickname.classList.add("m-nickname");

    let time_stamp = document.createElement('span');
    time_stamp.innerHTML = getChatFormatedDate(message.timestamp);
    time_stamp.classList.add('msg-time-stamp');

    if (isMyMessage(message.pkfp)) {
        message_heading.appendChild(time_stamp);
        message_heading.appendChild(nickname);
    } else if (message.service) {
        message_heading.innerHTML += '<b>Service  </b>';
        message_heading.appendChild(time_stamp);
    } else {
        //Not my Message
        if (message.alias) {
            message_heading.appendChild(alias);
            message_heading.appendChild(aliasNicknameDevisor);
        }
        message_heading.appendChild(nickname);
        message_heading.appendChild(time_stamp);
    }
    if (message.recipient && message.recipient !== "ALL") {
        let recipientId = document.createElement("div");
        recipientId.innerHTML = message.recipient;
        recipientId.classList.add("m-recipient-id");
        message_heading.appendChild(recipientId);
    }
    return message_heading;
}

function preparePrivateMark(message) {
    let privateMark = document.createElement("span");
    privateMark.classList.add("private-mark");
    if (isMyMessage(message.pkfp)) {
        privateMark.innerText = "(private to: ";
        let recipientName = chat.getMemberRepr(message.recipient);
        privateMark.innerText += recipientName + ")";
    } else {
        privateMark.innerText = "(private)";
    }
    return privateMark;
}

/**
 * Click handler when user clicks on attached file
 * @param ev
 * @returns {Promise<void>}
 */

async function downloadOnClick(ev) {
    console.log("Download event triggered!");
    let target = ev.target;
    while (target && !target.classList.contains("att-view")) {
        target = target.parentNode;
    }

    if (!target) {
        throw new Error("att-view container not found...");
    }
    let fileInfo = target.nextSibling.innerHTML; //Extract fileInfo from message

    let fileName = JSON.parse(fileInfo).name;
    target.childNodes[0].style.display = "inline-block";
    try {
        await chat.downloadAttachment(fileInfo); //download file
        console.log("Download complete!");
    } catch(err){
        toastr.warning("file download unsuccessfull: " + err)
        appendEphemeralMessage(fileName + " Download finished with error: " + err)
    }finally {
        target.childNodes[0].style.display = "none";
    }
}

/**
 * Processes all the attachments and returns
 * attachments wrapper which can be appended to a message
 * If no attachments are passed - returns undefined
 * @param attachments
 * @returns {*}
 */
function processAttachments(attachments) {
    if (attachments === undefined) {
        return undefined;
    }

    let getAttachmentSize = function (size) {
        let res = "";
        size = parseInt(size);
        if (size < 1000) {
            res = size.toString() + "b";
        } else if (size < 1000000) {
            res = Number((size / 1000).toFixed(1)).toString() + "kb";
        } else if (size < 1000000000) {
            res = Number((size / 1000000).toFixed(1)).toString() + "mb";
        } else {
            res = Number((size / 1000000000).toFixed(1)).toString() + "gb";
        }
        return res;
    };

    let attachmentsWrapper = document.createElement("div");
    attachmentsWrapper.classList.add("msg-attachments");

    for (let att of attachments) {
        let attachment = document.createElement("div");
        let attView = document.createElement("div");
        let attInfo = document.createElement("div");
        let attSize = document.createElement("span");
        let attName = document.createElement("span");
        let attIcon = document.createElement("span");
        let iconImage = document.createElement("img");

        // //State icons
        let attState = document.createElement("div");
        attState.classList.add("att-state");

        let spinner = document.createElement("img");
        spinner.classList.add("spinner");
        spinner.src = "/img/spinner.gif";
        spinner.display = "flex";

        attState.appendChild(spinner);

        iconImage.src = "/img/attachment.png";
        attSize.classList.add("att-size");
        attView.classList.add("att-view");
        attInfo.classList.add("att-info");
        attName.classList.add("att-name");
        iconImage.classList.add("att-icon");
        attIcon.appendChild(iconImage);
        attInfo.innerHTML = JSON.stringify(att);
        attName.innerText = att.name;
        attSize.innerHTML = getAttachmentSize(att.size);

        //Appending elements to attachment view
        attView.appendChild(attState);
        attView.appendChild(attIcon);
        attView.appendChild(attName);
        attView.appendChild(attSize);
        attView.addEventListener("click", downloadOnClick);
        attachment.appendChild(attView);
        attachment.appendChild(attInfo);
        attachmentsWrapper.appendChild(attachment);
    }
    return attachmentsWrapper;
}

function processMessageBody(text) {
    text = text.trim();
    let result = document.createElement("div");
    let startPattern = /__code/;
    let endPattern = /__end/;

    //no code
    if (text.search(startPattern) === -1) {
        result.appendChild(document.createTextNode(text));
        return result;
    }
    //first occurrence of the code
    let firstOccurrence = text.search(startPattern);
    if (text.substring(0, firstOccurrence).length > 0) {
        result.appendChild(document.createTextNode(text.substring(0, firstOccurrence)));
        text = text.substr(firstOccurrence);
    }
    let substrings = text.split(startPattern).filter(el => {
        return el.length !== 0;
    });
    for (let i = 0; i < substrings.length; ++i) {
        let pre = document.createElement("pre");
        let code = document.createElement("code");
        let afterText = null;
        let endCode = substrings[i].search(endPattern);
        if (endCode === -1) {
            code.innerText = processCodeBlock(substrings[i]);
        } else {
            code.innerText = processCodeBlock(substrings[i].substring(0, endCode));
            let rawAfterText = substrings[i].substr(endCode + 5).trim();
            if (rawAfterText.length > 0) afterText = document.createTextNode(rawAfterText);
        }
        //highliter:
        hljs.highlightBlock(code);
        ///////////

        pre.appendChild(code);
        result.appendChild(pre);
        pre.ondblclick = showCodeView;
        if (afterText) result.appendChild(afterText);
    }
    return result;
}

function showCodeView(event) {
    let pre = document.createElement("pre");
    pre.innerHTML = event.target.innerHTML;
    let div = document.createElement("div");
    div.appendChild(pre);
    showModalNotification("Code:", div.innerHTML);
}

function closeCodeView() {
    clearModal();
    document.querySelector("#code-view").style.display = "none";
}

function clearModal() {
    document.querySelector("#code--content").innerHTML = "";
}

function processCodeBlock(code) {
    code = code.trim();
    let separator = code.match(/\r?\n/) ? code.match(/\r?\n/)[0] : "\r\n";
    let lines = code.split(/\r?\n/);
    let min = Infinity;
    for (let i = 1; i < lines.length; ++i) {
        if (lines[i] === "") continue;
        try {
            min = Math.min(lines[i].match(/^\s+/)[0].length, min);
        } catch (err) {
            //found a line with no spaces, therefore returning the entire block as is
            return lines.join(separator);
        }
    }
    for (let i = 1; i < lines.length; ++i) {
        lines[i] = lines[i].substr(min);
    }
    return lines.join(separator);
}

function generateInvite(ev) {
    ensureConnected();
    console.log("Generating invite");
    buttonLoadingOn(ev.target);
    chat.requestInvite();
}

function showInviteCode(newInvite) {
    syncPendingInvites();
    toastr.success("New invite was generated successfully!");
}

function showModalNotification(headingText, bodyContent) {
    let wrapper = document.createElement("div");
    wrapper.classList.add("modal-notification--wrapper");
    let heading = document.createElement("h3");
    heading.classList.add("modal-notification--heading");
    let body = document.createElement("div");
    body.classList.add("modal-notification--body");
    heading.innerText = headingText;
    body.innerHTML = bodyContent;
    wrapper.appendChild(heading);
    wrapper.appendChild(body);
    let modalContent = document.querySelector('#code--content');
    modalContent.innerHTML = "";
    modalContent.appendChild(wrapper);
    let modalView = document.querySelector('#code-view');
    modalView.style.display = "block";
}

function loadingOn() {
    spinner.loadingOn();
}

function loadingOff() {
    if (spinner.isOn){
        spinner.loadingOff();
    }
}

function setView(view) {
    switch (view) {
        case "chat":
            util.displayFlex('#chat_room');
            util.displayFlex('#you_online');
            util.displayNone('#auth-wrapper');
            util.displayFlex('#chat-menu');
            util.displayNone('#settings-view');
            util.addClass('#chat-view-button', "active");
            util.removeClass('#settings-view-button', "active");
            break;
        case "auth":
            util.displayNone('#chat_room');
            util.displayNone('#you_online');
            util.displayBlock('#auth-wrapper');
            util.displayNone('#chat-menu');
            util.displayNone('#settings-view');
            break;
        case "settings":
            util.displayFlex('#settings-view');
            util.displayNone('#chat_room');
            util.displayNone('#you_online');
            util.displayNone('#auth-wrapper');
            util.displayFlex('#chat-menu');
            util.removeClass('#chat-view-button', "active");
            util.addClass('#settings-view-button', "active");
            break;
        default:
            throw new Error("setView: Invalid view: " + view);
    }
}

function syncPendingInvites() {
    if (!chat.session) {
        return;
    } else if (chat.session.settings.invites === undefined) {
        chat.settingsInitInvites();
        return;
    }
    let invites = Object.keys(chat.session.settings.invites);
    let container = document.querySelector('#pending-invites');
    container.innerHTML = "";
    for (let i in invites) {
        let inviteWrap = document.createElement("div");
        let inviteNum = document.createElement("div");
        let inviteRep = document.createElement("input");
        let inviteCopy = document.createElement("div");
        let inviteDel = document.createElement("div");
        let inviteID = document.createElement("div");
        let inviteCopyButton = document.createElement("button");
        let inviteDelButton = document.createElement("button");
        inviteWrap.classList.add("invite-wrap");
        inviteRep.classList.add("invite-rep");
        inviteID.classList.add("invite-id");
        inviteDel.classList.add("invite-del");
        inviteNum.classList.add("invite-num");
        inviteDelButton.classList.add("invite-del-button");
        inviteCopyButton.classList.add("invite-copy-button");
        inviteCopy.classList.add("invite-copy");
        inviteDelButton.innerText = 'Del';
        inviteCopyButton.innerText = 'Copy invite code';
        inviteDelButton.onclick = deleteInvite;

        inviteID.innerText = invites[i];

        inviteRep.value = chat.session.settings.invites[invites[i]].name ? chat.session.settings.invites[invites[i]].name : "New member";

        inviteNum.innerText = "#" + (parseInt(i) + 1);
        inviteDel.appendChild(inviteDelButton);
        inviteCopy.appendChild(inviteCopyButton);
        inviteWrap.appendChild(inviteNum);
        inviteWrap.appendChild(inviteRep);
        inviteWrap.appendChild(inviteCopy);
        inviteWrap.appendChild(inviteDel);
        inviteWrap.appendChild(inviteID);
        inviteCopyButton.addEventListener("click", copyInviteCode);

        inviteRep.addEventListener("click", editInviteeName);

        container.appendChild(inviteWrap);
    }
}

function editInviteeName(event) {
    tempName = event.target.value;
    event.target.value = "";
    event.target.addEventListener("focusout", processInviteeNameInput);
    event.target.addEventListener("keypress", inviteEditingProcessKeyPress);
}

function inviteEditingProcessKeyPress(event) {
    if (event.keyCode === 13) {
        console.log("Enter pressed!");
        event.target.blur();
    }
}

function processInviteeNameInput(event) {
    let newName = event.target.value.trim();
    if (newName === "") {
        event.target.value = tempName;
        return;
    } else {
        chat.updateSetInviteeName(event.target.parentNode.lastChild.innerHTML, newName);
    }
    event.target.removeEventListener("focusout", processInviteeNameInput);
}

function copyInviteCode(event) {
    let inviteElement = event.target.parentNode.parentNode.lastChild;
    let inviteID = inviteElement.innerHTML;
    let textArea = document.createElement("textarea");
    textArea.value = inviteID;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
        toastr.info("Invite code was copied to the clipboard");
    } catch (err) {
        toastr.error("Error copying invite code to the clipboard");
    }
    textArea.remove();
}

function deleteInvite(event) {
    ensureConnected();
    let button = event.target;
    let inviteID = button.parentNode.parentNode.lastChild.innerHTML;
    chat.deleteInvite(inviteID);
}

// function processTopicJoinSuccess(data) {
//     clearInviteInputs();
//     let heading = "You have joined topic successfully, and can now login. SAVE YOUR PRIVATE KEY!!!";
//     let toastrMessage = "Topic was created successfully!";
//     displayNewTopicData(data, heading, toastrMessage);
// }

function enableSettingsMenuListeners() {
    let menuItems = document.querySelector("#settings-menu").children;
    for (let i of menuItems) {
        i.addEventListener("click", processSettingsMenuClick);
    }
    document.querySelector("#invites-container").style.display = "flex";
    document.querySelector("#chat-settings").style.display = "none";
    document.querySelector("#participants-container").style.display = "none";

}

function processSettingsMenuClick(event) {
    let menuItems = document.querySelector("#settings-menu").children;
    for (let i of menuItems) {
        i.classList.remove("active");
    }
    let target = event.target;
    target.classList.add("active");
    document.querySelector("#invites-container").style.display = target.innerText === "INVITES" ? "flex" : "none";
    document.querySelector("#participants-container").style.display = target.innerText === "PARTICIPANTS" ? "flex" : "none";
    document.querySelector("#chat-settings").style.display = target.innerText === "CHAT SETTINGS" ? "flex" : "none";

}

function processChatScroll(event) {
    let chatWindow = event.target;
    if (!chatWindow.firstChild) return;
    if (event.target.scrollTop <= 1) {
        //load more messages
        console.log("loading more messages");
        let lastLoadedMessageID = chatWindow.firstChild.querySelector(".message-id").innerText;
        chat.loadMoreMessages(lastLoadedMessageID);
    }
}

function clearLoginPrivateKey() {
    util.val("private-key", "");
}

function clearAllInputs() {
    clearModal();
}

function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

///Testing blob download
function downloadAttachment(fileName, data) {
    appendEphemeralMessage(fileName + " Download successfull.")
    let arr = new Uint8Array(data);
    let fileURL = URL.createObjectURL(new Blob([arr]));
    downloadURI(fileURL, fileName);
}

/**
 * Searches loaded message with provided ID
 * @param id
 */
function findMessage(id) {
    let chatWindow = document.querySelector("#chat_window");
    for (let msg of chatWindow.children) {

        if (msg.getElementsByClassName("message-id")[0].innerHTML == id) {
            console.log("Message found");
            return msg;
        }
    }
}

async function loadAudio(fileInfo, fileData) {
    //search right message
    let message = findMessage(fileInfo.messageID);
    if (!message) {
        console.error("Message not found");
        return;
    }

    let audio = document.createElement("audio");
    let arr = new Uint8Array(fileData);
    let fileURL = URL.createObjectURL(new Blob([arr]));
    audio.setAttribute("controls", "");
    audio.setAttribute("src", fileURL);

    let viewWrap = message.getElementsByClassName("att-view")[0];
    viewWrap.innerHTML = "";
    viewWrap.appendChild(audio);
    console.log("Removing even listener");
    viewWrap.removeEventListener("click", downloadOnClick);
}

function processAttachmentChosen(ev) {
    let attachemtsWrapper = document.querySelector("#chosen-files");
    let fileData = ev.target.files[0];
    attachemtsWrapper.innerHTML = "";
    if (!fileData) {
        return;
    }

    let attWrapper = document.createElement("div");
    attWrapper.classList.add("chosen-file-wrap");

    let chosenFileTxt = document.createElement("div");
    chosenFileTxt.classList.add("chosen-file");
    chosenFileTxt.innerText = fileData.name;
    let closeImg = document.createElement("img");
    closeImg.setAttribute("src", "/img/close.png");
    closeImg.addEventListener("click", clearAttachments);

    attWrapper.appendChild(closeImg);
    attWrapper.appendChild(chosenFileTxt);
    attachemtsWrapper.appendChild(attWrapper);
}

function clearAttachments() {
    let attachemtsInput = document.querySelector("#attach-file");
    attachemtsInput.value = "";
    let attachemtsWrapper = document.querySelector("#chosen-files");
    attachemtsWrapper.innerHTML = "";
}

function editMyNickname(ev) {
    let newNickname = ev.target.value.trim().toString("utf8");
    if (!newNickname || newNickname === chat.session.settings.nickname) {
        ev.target.value = chat.session.settings.nickname;
        ev.target.blur();
        return;
    }
    ev.target.value = newNickname;
    chat.myNicknameUpdate(ev.target.value);
    ev.target.blur();
}

function editTopicName(ev) {
    let newTopicName = ev.target.value.trim();
    if (!newTopicName || newTopicName === chat.session.settings.topicName) {
        ev.target.value = chat.session.settings.topicName;
        ev.target.blur();
        return;
    }
    ev.target.value = newTopicName;
    chat.topicNameUpdate(ev.target.value);
    ev.target.blur();
    document.title = chat.session.settings.topicName + " | Islands";
}

function buttonLoadingOn(element) {
    element.classList.add("running");
    element.classList.add("disabled");
}

function buttonLoadingOff(element) {
    element.classList.remove("running");
    element.classList.remove("disabled");
}

function refreshInvites(ev) {
    ensureConnected();
    console.log("Generating invite");
    buttonLoadingOn(ev.target);
    chat.syncInvites();
}

function refreshInvitesSuccess() {
    buttonLoadingOff(document.querySelector("#refresh-invites"));
    toastr.success("Invites re-synced");
}

/**
 * Changes Island connection indicator.
 * @param status int can be one of following:
 *     0 - connected
 *     1 - disconnected
 *     2 - connecting
 */
function switchConnectionStatus(status) {
    if (!Number.isInteger(status) || ! (0 <= status <= 2)){
        throw new Error("Switch connection status: status is invalid")
    }
    switch(status){
        case 0:
            util.displayFlex("#connection-status--connected");
            util.displayNone("#connection-status--disconnected");
            util.displayNone("#connection-status--connecting")
            appendEphemeralMessage("Connection with island established");
            break;
        case 1:
            util.displayNone("#connection-status--connected");
            util.displayFlex("#connection-status--disconnected");
            util.displayNone("#connection-status--connecting")
            appendEphemeralMessage("Connection with island lost");
            break;
        case 2:
            util.displayFlex("#connection-status--connecting")
            util.displayNone("#connection-status--connected");
            util.displayNone("#connection-status--disconnected");
            appendEphemeralMessage("Connecting to island...");
            break;
    }
}

function attemptReconnection() {
    if (connecting){
        console.log("Already connecting...")
        return;
    } else if (chat.islandConnectionStatus){
        console.log("Already connected");
        return;
    }

    console.log("Attempting reconnection...")
    connecting = true;
    switchConnectionStatus(2);
    chat.attemptReconnection().then(() => {
        console.log("Reconnection attempt resolved")
    }).catch(err => {
        console.trace("Reconnection error: " + err);
        connecting = false
        switchConnectionStatus(1);
    }).finally(()=>{
        console.log("Finally block after reconnection attempt");
        switchConnectionStatus(chat.islandConnectionStatus ? 0 : 1)
    });
}

function switchSounds(ev) {
    if (chat.session.settings.soundsOn) {
        chat.session.settings.soundsOn = false;
        ev.target.src = soundsOnOfIcons.off;
    } else {
        chat.session.settings.soundsOn = true;
        ev.target.src = soundsOnOfIcons.on;
    }
}

function participantAliasChange(ev) {
    console.log("Processing participant alias change");
    ensureConnected();
    let id = ev.target.parentNode.firstChild.innerText;
    let newAlias = ev.target.value.trim();
    if (!newAlias) {
        chat.deleteMemberAlias(id);
    } else {
        chat.setMemberAlias(id, ev.target.value);
    }
    chat.saveClientSettings();
}

function ensureConnected() {
    if (!chat.islandConnectionStatus) {
        toastr.warning("You are disconnected from the island. Please reconnect to continue");
        throw new Error("No island connection");
    }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Locks send message button and shows loading animation
function lockSend(val) {
    sendButtonLocked = !!val;
    let sendButton = document.querySelector('#send-new-msg');
    let newMsgField = document.querySelector('#new-msg');
    sendButtonLocked ? buttonLoadingOn(sendButton) : buttonLoadingOff(sendButton);
    sendButtonLocked ? newMsgField.setAttribute("disabled", true) : newMsgField.removeAttribute("disabled");
}


function appendEphemeralMessage(msg){
    if (!msg){
        console.log("Message is empty.")
        return
    }
    try{
        let msgContainer = util.bake("div", {classes: "ephemeral-msg"})
        let headingContainer = util.bake("div", {classes: "msg-heading"})
        let text = util.bake("b", {text: "Ephemeral"})
        let timestamp = util.bake("span", {classes: "msg-time-stamp"})
        timestamp.innerText = getChatFormatedDate(new Date());
        util.appendChildren(headingContainer, [text, timestamp])
        let msgBodyContainer = util.bake("div", {classes: "msg-body"})
        let msgBody = util.bake("div", {html: msg})
        msgBodyContainer.appendChild(msgBody)
        util.appendChildren(msgContainer, [headingContainer, msgBodyContainer])
        util.$("#chat_window").appendChild(msgContainer);
    }catch(err){
        console.log("EPHEMERAL ERROR: " + err)
    }

}
