import '../css/main.sass';


import * as toastr from "toastr";
window.toastr = toastr;
import { iCrypto } from "./lib/iCrypto";
import { Vault } from "./lib/Vault";
import * as forge from "node-forge";
import * as CuteSet from "cute-set"
import * as dropdown from "./lib/dropdown";
import * as editableField from "./lib/editable_field";
import { ChatUtility } from "./chat/ChatUtility"




import { verifyPassword } from "./lib/PasswordVerify";

import * as util from "./lib/dom-util"

window.iCrypto = iCrypto;

let adminSession;
let filterFieldSelector;
let logTableBody;



/**
 * Closure for processing admin requests while admin logged in
 * Initialized when admin logs in
 * @data - Object with request data
 * @onSuccess - success handler
 * @onError - error handler
 */
let processAdminRequest = ()=>{throw"Admin session uninitialized"};


document.addEventListener('DOMContentLoaded', event => {
    util.$("main").classList.add("main-admin");
    util.$("header").style.minWidth = "111rem";
    if (!secured){

        util.$('#island-setup').addEventListener("click", setupIslandAdmin);
        util.$("#setup--wrapper").addEventListener("keyup", (ev)=>{
            if (ev.which === 13 || ev.keyCode === 13) {
                setupIslandAdmin();
            }
        });
        util.displayFlex('#setup--wrapper');
        return ;
    }
    $('#admin-login').click(adminLogin);
    util.$("#admin-login--wrapper").addEventListener("keyup", (ev)=>{
        if (ev.which === 13 || ev.keyCode === 13) {
            adminLogin();
        }
    })


    $('#run-update').click(launchUpdate);

    $('#add-admin-service').click(addAdminHiddenService);
    $('#add-guest-service').click(createGuest);

    $('#update-from-file').click(switchUpdateMode);
    $('#update-from-git').click(switchUpdateMode);

    $('#to-chat').click(returnToChat);
    $('#admin-logout-button').click(adminLogout);

    $('#clear-logs').click(clearLogs);
    $('#update-file').change(processUpdateFile);

    $('#admin-login--wrapper').css('display', "flex");
    $('#setup--wrapper').hide();

    $('#login-setup--wrapper').css('display', "block");

    $('.update-option').each((index, el) => {
        $(el).click(switchUpdateOption);
    });

    logTableBody = document.querySelector("#log-content").lastElementChild;
    filterFieldSelector = document.querySelector('#filter-field-selector');
    filterFieldSelector.addEventListener("change", filterLogs);
    document.querySelector("#log-filter").addEventListener("keyup", filterLogs);
    $('#log-reverse').click(reverseLogList);
    prepareAdminMenuListeners();
    prepareLogPageListeners();
    autoLogin();
});


function autoLogin(){

    let url = new URL(window.location.href);
    let id = url.searchParams.get("id");
    if(!id) return;
    loadingOn();
    let token = url.searchParams.get("token");
    let pkcipher = localStorage.getItem(id);
    if (!pkcipher){
        loadingOff();
        throw ("Autologin failed: no private ley found in local storage");
    }

    let ic = new iCrypto();
    ic.addBlob("pkcip", pkcipher)
        .addBlob("key", token)
        .AESDecrypt("pkcip", "key", "privk", true, "CBC", "utf8");
    let privateKey = ic.get("privk");

    requestAdminLogin(privateKey)
        .then(()=>{})
        .catch(()=>{});
    localStorage.removeItem(id);
}


//*********ISLAND ACCESS SECTION*********************//

function addAdminHiddenService(){
    try{
        processAdminRequest({
            action: "launch_admin_hidden_service",
            permanent: true
        }, onHiddenServiceUpdate, displayServerRequestError)

    } catch (err) {
        toastr.warning("Error creating admin hidden service: " + err.message);

    }
}

function createGuest() {
    try{
        let ic = new iCrypto();
        ic.createNonce("n")
            .setRSAKey("privk", adminSession.privateKey, "private")
            .privateKeySign("n", "privk", "sign")
            .bytesToHex("n", "nhex");
        processAdminRequest({
            action: "create_guest",
            vaultID: ic.get("nhex"),
            sign: ic.get("sign"),
            permanent: true
        }, onHiddenServiceUpdate, displayServerRequestError)

    } catch (err) {
        toastr.warning("Error creating admin hidden service: " + err.message);
    }
}


function enableHiddenService(ev){
    let onion = ev.target.parentNode.parentNode.parentNode.parentNode.children[1].innerText;

    try{
        processAdminRequest({
            action: "enable_hidden_service",
            onion: onion

        }, onHiddenServiceUpdate, displayServerRequestError)
    }catch(err){
        displayServerRequestError(err)
    }
}

function disableHiddenService(ev){
    let onion = ev.target.parentNode.parentNode.parentNode.parentNode.children[1].innerText;

    try{
        processAdminRequest({
            action: "disable_hidden_service",
            onion: onion
        }, onHiddenServiceUpdate, displayServerRequestError)
    }catch(err){
        displayServerRequestError(err)
    }
}



/**
 * Deactivates and deletes hidden service
 * If it is guest hidden service - delet
 *
 * @param ev
 */
function deleteGuest(ev){
    try{
        let row = ev.target.parentNode.parentNode.parentNode.parentNode;
        let onion = row.children[1].innerText;
        let isAdmin = /admin/i.test(row.children[3].innerText);
        if(isAdmin){
            throw "Only applicable to guest hidden service";
        }
        if(!confirm("This will delete permanently hidden service and associated with it guest vault." +
            "After this operation guest will no longer be able to access this island. \n\nProceed?")){
            return
        }
        processAdminRequest({
            action: "delete_guest",
            onion: onion
        }, onHiddenServiceUpdate, displayServerRequestError)
    }catch(err){
        toastr.warning("Error deleting guest: " + err);
        console.error(err);
    }
}

function deleteAdminHiddenService(ev){
    let row = ev.target.parentNode.parentNode.parentNode.parentNode;
    let onion = row.children[1].innerText;
    let isAdmin = /admin/i.test(row.children[3].innerText);
    try{
        if(!isAdmin){
            throw "Only applicable to admin hidden service";
        }
        processAdminRequest({
            action: "delete_hidden_service",
            onion: onion
        }, onHiddenServiceUpdate, displayServerRequestError)
    }catch(err){
        toastr.warning("Error deleting guest: " + err);
        console.error(err);
    }
}


function displayServerRequestError(err){
    toastr.warning("Error creating admin hidden service: " + err.responseText)
}

//TODO finish method!
// function deleteHiddenService(ev) {
//     let onion = ev.target.previousSibling.innerHTML;
//
//     let privKey = adminSession.privateKey;
//     let pkfp = adminSession.pkfp;
//     let ic = new iCrypto();
//     ic.createNonce('n').setRSAKey("pk", privKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex');
//
//     $.ajax({
//         type: "POST",
//         url: "/admin",
//         dataType: "json",
//         data: {
//             action: "delete_hidden_service",
//             nonce: ic.get('nhex'),
//             sign: ic.get('sign'),
//             pkfp: pkfp,
//             onion: onion
//         },
//         success: processIslandHiddenServiceDeletion,
//         err: err => {
//             console.log("Error deleting hidden service: " + err);
//         }
//     });
// }



/**
 * Updates list of running Island hidden services
 * @param {Array} hiddenServices
 */
function updateHiddenServicesList(hiddenServices) {
    let hsContainer = document.querySelector("#hidden-services-wrap");
    hsContainer.innerHTML = "";
    let count = 0;
    for (let key of Object.keys(hiddenServices)) {
        let hsWrap = document.createElement("div");
        let num = document.createElement("div");
        let val = document.createElement("div");
        let del = document.createElement("div");
        hsWrap.classList.add("hidden-service");
        num.classList.add("hs-num");
        val.classList.add("hs-val");
        del.classList.add("hs-del");
        let enumer = count + 1;
        num.innerHTML = "#" + enumer;
        val.innerHTML = hiddenServices[key].id.substring(0, 16) + ".onion";
        del.innerHTML = "Delete";
        del.addEventListener("click", deleteGuest);
        hsWrap.appendChild(num);
        hsWrap.appendChild(val);
        hsWrap.appendChild(del);
        hsContainer.appendChild(hsWrap);
        count ++;
    }
}



function onHiddenServiceUpdate(data) {

    let hiddenServices = JSON.parse(data.hiddenServices);

    let tableBody = util.$("#hidden-services-wrap");
    tableBody.innerHTML = "";
    let enumer = 1;
    for (let key of Object.keys(hiddenServices)){
        let isEnabled = hiddenServices[key].enabled;
        let row = util.bake("tr");
        let enumEl = util.bake("td", {classes: "hs-enum", text: enumer});
        let link = util.bake("td", {classes: "hs-link", text: key + ".onion"});

        let description = extractDescription(hiddenServices[key].description)

        let hsDesc = bakeDescriptionElement(util.bake("td", {classes: "hs-desc"}), description);
        let hsType = util.bake("td", {classes: "hs-type", text: hiddenServices[key].admin ? "Admin" : "User"});
        let status = util.bake("td", {classes: ["hs-status", isEnabled ? "hs-status-enabled" : "hs-status-disabled" ],
            text: isEnabled ? "Enabled" : "Disabled"});
        let actions = bakeHsRecordActionsMenu(util.bake("td", {classes: "hs-actions"}),
            hiddenServices[key].admin);
        util.appendChildren(row, [enumEl, link, hsDesc, hsType, status, actions]);
        tableBody.appendChild(row);
        enumer++;
        link.addEventListener("click", (ev)=>{
            copyTextToBuffer(ev.target.innerText, "Onion link copied to clipboard")
        })
    }
}


function extractDescription(cipher){
    if (cipher === undefined || cipher === ""){
        return "";
    }
    return ChatUtility.decryptStandardMessage(cipher, adminSession.privateKey);
}

function bakeDescriptionElement(cell, description){
    let field = editableField.bakeEditableField("Place for description",  "editable-field-gray");
    field.addEventListener("change", updateHSDescription);
    field.addEventListener("keyup", ev=>{
        if (ev.which === 13 || ev.keyCode === 13) {
            document.activeElement.blur();
        }
    });
    field.value = description;
    cell.appendChild(field);
    return cell
}


function updateHSDescription(ev){
    let description = ev.target.value.trim();
    let cipher = "";
    let row = ev.target.parentNode.parentNode;
    let onion = row.children[1].innerText;
    if(description && description !== ""){
        cipher = ChatUtility.encryptStandardMessage(description, adminSession.publicKey);
    }

    try{
        processAdminRequest({
            action: "update_hs_description",
            onion: onion,
            description: cipher
        }, onHiddenServiceUpdate, displayServerRequestError)
    }catch(err){
        toastr.warning("Error deleting guest: " + err);
        console.error(err);
    }
}

/**
 * Creates dropdown menu "Actions" for each hidden service running
 * @param cell
 * @isAdmin boolean
 * @returns {*}
 */
function bakeHsRecordActionsMenu(cell, isAdmin){
    cell.appendChild(dropdown.bakeDropdownMenu("Actions",
        {
            "Copy onion link": (ev)=>{
                let text = ev.target.parentNode.parentNode.parentNode.parentNode.children[1].innerText;
                copyTextToBuffer(text, "Onion link copied to clipboard")
            },
            "Enable" : enableHiddenService,
            "Disable": disableHiddenService,
            "Delete": isAdmin? deleteAdminHiddenService : deleteGuest
        }));
    return cell
}


/**
 * Copies passed text to clipboard
 * @param text - text to copy
 * @param message - message to display
 */
function copyTextToBuffer(text, message){
    let textArea = util.bake("textarea");
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
        toastr.info(message);
    } catch (err) {
        toastr.error("Error copying invite code to the clipboard");
    }
    textArea.remove();
}





//*********END ISLAND ACCESS SECTION*********************//


// function onionAddressFromPrivateKey(privateKey) {
//     let ic = new iCrypto();
//     ic.setRSAKey("privk", privateKey, "private").publicFromPrivate("privk", "pubk");
//     let pkraw = forge.pki.publicKeyFromPem(ic.get("pubk"));
//     let pkfp = forge.pki.getPublicKeyFingerprint(pkraw, { encoding: 'hex', md: forge.md.sha1.create() });
//     if (pkfp.length % 2 !== 0) {
//         s = '0' + s;
//     }
//     let bytes = [];
//     for (let i = 0; i < pkfp.length / 2; i = i + 2) {
//         bytes.push(parseInt(pkfp.slice(i, i + 2), 16));
//     }
//
//     return base32.encode(bytes).toLowerCase() + ".onion";
// }



function adminLogin() {
    let password = document.querySelector("#admin-password").value.trim();
    if(!password){
        toastr.warning("Password is required!");
        return;
    }
    loadingOn();

    //Request admin vault
    $.ajax({
        type: "GET",
        url: "/admin/vault",
        success: async res =>{
            try{
                let decryptedVault = await decryptVault(res.vault, password);
                await requestAdminLogin(decryptedVault.adminKey);
            }catch(err){
                loadingOff();
                toastr.warning("Login failed. Check the password and try again.");
                console.log("Login error: " + err);
            }

        },
        error: async err=>{
            loadingOff();
            toastr.warning("Admin login error: " + err)
        }
    });
}


/**
 * Decrypt the vault, get admin record, process the normal login
 * @param vaultCipher
 * @param password
 * @returns {Promise<void>}
 */
function decryptVault(vaultCipher, password){
    return new Promise((resolve, reject)=>{
        try{
            let vault = new Vault();
            vault.initSaved(vaultCipher, password);
            if(!vault.admin || !vault.adminKey){
                reject("Admin vault is invalid, or doesn't have a private key")
            }
            resolve(vault);
        }catch(err){
            reject(err);
        }
    })
}

async function requestAdminLogin (privateKey){
    try {
        let ic = new iCrypto();
        ic.createNonce('n').setRSAKey("pk", privateKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex').publicFromPrivate("pk", "pub").getPublicKeyFingerprint("pub", "pkfp");
        $.ajax({
            type: "POST",
            url: "/admin",
            dataType: "json",
            data: {
                action: "admin_login",
                nonce: ic.get('nhex'),
                sign: ic.get('sign'),
                pkfp: ic.get("pkfp")
            },
            success: res => {
                adminSession = {
                    publicKey: ic.get('pub'),
                    privateKey: ic.get('pk'),
                    pkfp: ic.get('pkfp')
                };

                processAdminRequest = prepareRequestProcessor(adminSession);

                $('#admin-content-wrapper').css("display", "flex");
                $('.heading__main').html("Rule your island");
                $('#admin-login--wrapper').hide();
                processLoginData(res);
                displayAdminMenu(true);
                loadingOff();
                toastr.info("Admin login successfull!");
            },

            error: err => {
                loadingOff();
                toastr.warning("Error: \n" + err.responseText);
            }
        });
    } catch (err) {
        loadingOff();
        clearAdminPrivateKey();
        toastr.warning("Login error: \n" + err);
    }
}

function processLoginData(res) {
    let loggerState = res.loggerInfo.enabled === "true" || res.loggerInfo.enabled === true;
    let loggerLevel = res.loggerInfo.level;
    $("#logs-state").val(loggerState ? "true" : "false");
    $("#log-highest-level").val(loggerLevel);
    onHiddenServiceUpdate(res);
}

function setupIslandAdmin() {

    $('#island-setup').addClass('btn-loading');

    let password = document.querySelector('#new-admin-password').value;
    let confirm = document.querySelector('#new-admin-password-confirm').value;
    let error  = verifyPassword(password, confirm);
    if(error){
        toastr.warning(error);
        loadingOff();
        return;
    }

    setupAdminContinue(password).then(() => {
        toastr.info("Setup successfull!!");
    }).catch(err => {
        toastr.error(err);
    });
}

function setupAdminContinue(password) {
    return new Promise((resolve, reject) => {
        loadingOn();
        let ic = new iCrypto();
        ic.generateRSAKeyPair("adminkp")
            .createNonce("n")
            .privateKeySign("n", "adminkp", "sign")
            .bytesToHex("n", "nhex");


        let vault = new Vault();
        vault.initAdmin(password, ic.get("adminkp").privateKey);


        let vaultEncData = vault.pack();
        let vaultPublicKey = vault.publicKey;
        let adminPublicKey = ic.get("adminkp").publicKey;

        $.ajax({
            type: "POST",
            url: "/admin",
            dataType: "json",
            data: {
                action: "admin_setup",
                adminPublickKey: adminPublicKey,
                nonce: ic.get('nhex'),
                sign: ic.get("sign"),
                vault: vaultEncData.vault,
                vaultPublicKey: vaultPublicKey,
                vaultSign: vaultEncData.sign
            },
            success: () => {
                loadingOff();
                adminSession = {
                    publicKey: ic.get('adminkp').publicKey,
                    privateKey: ic.get('adminkp').privateKey
                };
                util.$("#setup--wrapper").style.display = "none";
                util.$("#registration-complete--wrapper").style.display = "flex";


                $('#island-setup').removeClass('btn-loading');
                resolve();
            },
            error: err => {
                loadingOff();
                reject("Fail!" + err);
                $('#island-setup').removeClass('btn-loading');
            }
        });
    });
}

function switchView(view) {
    let views = {
        admin: () => {
            $('#admin-login--wrapper').css('display', "flex");
            $('#setup--wrapper').hide();
        }
    };
    views[view]();
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

function closeCodeView() {
    document.querySelector("#code-view").style.display = "none";
}

function switchUpdateMode() {
    if ($('#update-from-file').prop('checked')) {
        $('#update-from-file--wrapper').css("display", "block");
        $('#update-from-git--wrapper').hide();
        $('#github-update-options--wrap').hide();
    } else {
        $('#update-from-file--wrapper').hide();
        $('#update-from-git--wrapper').css("display", "block");
        $('#github-update-options--wrap').css("display", "block");
    }
}

function processUpdateFile() {
    let file = document.querySelector("#update-file").files[0];
    getUpdateFileData(file).then(filedata => {
        let signature = signUpdateFile(filedata);
        document.querySelector("#pkfp").value = adminSession.pkfp;
        document.querySelector("#sign").value = signature;
        document.querySelector("#select-file").innerText = "SELECTED: " + file.name;
    }).catch(err => {
        throw err;
    });
}

function launchUpdate() {
    if ($('#update-from-file').hasClass('active') && document.querySelector("#update-file").value) {
        loadingOn();
        updateFromFile();
    } else if ($('#update-from-git').hasClass('active')) {
        console.log("Updating from GIT");
        loadingOn();
        updateFromGithub();
    } else {
        toastr.warning("Please select the update file!");
    }
}

function updateFromFile() {
    let file = document.querySelector("#update-file").files[0];
    getUpdateFileData(file).then(filedata => {
        let signature = signUpdateFile(filedata);
        sendUpdateFromFileRequest(file, signature);
    }).catch(err => {
        throw err;
    });
}

function getUpdateFileData(file) {
    return new Promise((resolve, reject) => {
        try {
            let reader = new FileReader();

            reader.onload = () => {
                resolve(reader.result);
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            reject(err);
        }
    });
}

function signUpdateFile(filedata) {
    let ic = new iCrypto();
    ic.setRSAKey("pk", adminSession.privateKey, "private").addBlob("f", filedata).privateKeySign("f", "pk", "sign");
    return ic.get("sign");
}

function getSelectedUpdateBranch() {
    let branchSelect = document.querySelector("#gh-update-branch-select");
    return branchSelect.options[branchSelect.options.selectedIndex].value;
}

function updateFromGithub() {
    let ic = new iCrypto();

    ic.setRSAKey("pk", adminSession.privateKey, "private").createNonce("n").bytesToHex("n", "nhex").privateKeySign("n", "pk", "sign");
    let data = new FormData();
    data.append("action", "update_from_github");
    data.append("branch", getSelectedUpdateBranch());
    data.append("pkfp", adminSession.pkfp);
    data.append("nonce", ic.get("nhex"));
    data.append("sign", ic.get("sign"));
    sendUpdateRequest(data);
}

function sendUpdateFromFileRequest(filedata, signature) {
    let data = new FormData();
    data.append("action", "update_from_file");
    data.append("pkfp", adminSession.pkfp);
    data.append("file", document.querySelector("#update-file").files[0]);
    data.append("sign", signature);

    sendUpdateRequest(data);
}

function sendUpdateRequest(data) {
    let request = new XMLHttpRequest();
    request.open("POST", window.location.href, true);
    request.send(data);
    request.onreadystatechange = () => {
        if (request.readyState === XMLHttpRequest.DONE) {
            //
            console.log("Handling response");
            loadingOff();
            if (request.status === 200) {
                $('#close-code-view').hide();
                showModalNotification("Update completed", "<span id=timer>You will be redirected in 5 seconds</span>");
                delayedPageReload(5);
            } else {
                toastr.warning("Update failed: " + request.responseText);
            }
        }
    };
}

function delayedPageReload(seconds) {
    if (--seconds) {
        $("#timer").text("You will be redirected in " + seconds + (seconds > 1 ? " seconds" : " second"));
    } else {
        window.location.href = "/";
        return;
    }
    setTimeout(() => {
        delayedPageReload(seconds);
    }, 1000);
}
function loadingOnPromise() {
    return new Promise((resolve, reject) => {
        try {
            loadingOn();
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}
function loadingOn() {
    $('body').waitMe({
        effect: 'roundBounce',
        bg: 'rgba(255,255,255,0.7)',
        textPos: 'vertical',
        color: '#33b400'
    });
}

function loadingOff() {
    $('body').waitMe('hide');
}

function switchUpdateOption(event) {
    if ($(event.target).hasClass("active")) {
        return;
    }

    $(".update-option").each((index, el) => {
        if (!$(el).hasClass("active") && $(el).attr("id") === "update-from-file") {
            $("#update-file--wrapper").css("display", "flex");
        } else if ($(el).hasClass("active") && $(el).attr("id") === "update-from-file") {
            $("#update-file--wrapper").css("display", "none");
        }
        $(el).toggleClass("active");
    });
}

function returnToChat() {
    adminSession = undefined;
    clearAdminPrivateKey();
    document.location = "/";
}

function adminLogout() {
    displayAdminMenu(false);
    adminSession = undefined;
    clearAdminPrivateKey();
    document.location.reload();
}

function displayAdminMenu(on) {
    if (on) {
        $('#admin-menu').css("display", "flex");
    } else {
        $('#admin-menu').hide();
    }
}

function prepareAdminMenuListeners() {
    document.querySelector("#island-admin-main-menu").childNodes.forEach(node => {
        node.addEventListener("click", processMainMenuClick);
    });
}

function processMainMenuClick(ev) {
    if (ev.target.classList.contains("active")) {
        return;
    }
    let menu = document.querySelector("#island-admin-main-menu");
    for (let item of menu.children) {
        item.classList.remove("active");
    };

    let pages = document.querySelector("#admin-pages");
    for (let item of pages.children) {
        item.classList.remove("active");
    };

    let index = getElementIndex(ev.target);

    pages.children[index].classList.add("active");
    menu.children[index].classList.add("active");
    document.querySelector("#admin-section-heading").innerHTML = ev.target.innerHTML;
}

function clearAdminPrivateKey() {
    $("#admin-private-key").val("");
}

function getElementIndex(node) {
    let index = 0;
    while (node = node.previousElementSibling) {
        index++;
    }
    return index;
}

function loadLogs(errorsOnly = false) {
    let privKey = adminSession.privateKey;
    let pkfp = adminSession.pkfp;
    let ic = new iCrypto();
    ic.createNonce('n').setRSAKey("pk", privKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex');

    $.ajax({
        type: "POST",
        url: "/admin",
        dataType: "json",
        data: {
            action: "load_logs",
            nonce: ic.get('nhex'),
            sign: ic.get('sign'),
            pkfp: pkfp,
            errorsOnly: errorsOnly
        },
        success: processLogsLoaded,
        err: err => {
            console.log("Error loading logs: " + err);
            toastr.warning("Error loading logs: " + err);
        }
    });
}

function processLogsLoaded(res) {
    let records = res.records.split("\n");
    let table = document.querySelector("#log-content").lastElementChild;
    table.innerHTML = "";
    for (let record of records) {
        let parsed;
        try {
            parsed = JSON.parse(record);
        } catch (err) {
            continue;
        }

        let row = document.createElement("tr");
        row.classList.add(parsed.level);
        let ts = document.createElement("td");
        let level = document.createElement("td");
        let msg = document.createElement("td");
        ts.classList.add("log-timestamp");
        level.classList.add("log-level");
        msg.classList.add("log-msg");
        ts.innerHTML = parsed.timestamp;
        level.innerHTML = parsed.level;
        msg.innerHTML = parsed.message;
        row.append(ts);
        row.append(level);
        row.append(msg);
        let additionalValues = new CuteSet(Object.keys(parsed)).minus(["level", "message", "timestamp"]);
        if (additionalValues.length() > 0) {
            let addCell = document.createElement("td");
            for (let key of additionalValues) {
                let wrap = document.createElement("div");
                wrap.classList.add("log-add-value");
                let k = document.createElement("div");
                let b = document.createElement("b");
                k.classList.add("log-key");
                let v = document.createElement("div");
                v.classList.add("log-val");
                b.innerHTML = key;
                k.appendChild(b);
                v.innerHTML = parsed[key];
                wrap.appendChild(k);
                wrap.appendChild(v);
                addCell.appendChild(wrap);
                row.appendChild(addCell);
            }
        }
        table.appendChild(row);
    }
    toastr.info("Logs loaded successfully");
}

function requestLoggerStateChange(ev) {
    let selectedElement = ev.target.options[ev.target.selectedIndex];
    let privKey = adminSession.privateKey;
    let pkfp = adminSession.pkfp;
    let ic = new iCrypto();
    ic.createNonce('n').setRSAKey("pk", privKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex');

    $.ajax({
        type: "POST",
        url: "/admin",
        dataType: "json",
        data: {
            action: "logger_state_change",
            nonce: ic.get('nhex'),
            state: selectedElement.value,
            sign: ic.get('sign'),
            pkfp: pkfp

        },
        success: () => {
            let message = "Logger has been successfully " + (selectedElement.value === "true" ? "enabled" : "disabled");
            toastr.info(message);
        },
        err: err => {
            toastr.warning("Error loading logs: " + err);
        }
    });
}

function requestLoggerLevelChange(ev) {
    let selectedElement = ev.target.options[ev.target.selectedIndex];
    let privKey = adminSession.privateKey;
    let pkfp = adminSession.pkfp;
    let ic = new iCrypto();
    ic.createNonce('n').setRSAKey("pk", privKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex');

    $.ajax({
        type: "POST",
        url: "/admin",
        dataType: "json",
        data: {
            action: "log_level_change",
            nonce: ic.get('nhex'),
            level: selectedElement.value,
            sign: ic.get('sign'),
            pkfp: pkfp

        },
        success: () => {
            toastr.info("Log level has been changed to: " + selectedElement.value);
        },
        err: err => {
            toastr.warning("Error loading logs: " + err);
        }
    });
}

function prepareLogPageListeners() {
    document.querySelector("#load-logs").addEventListener("click", () => {
        loadLogs();
    });

    document.querySelector("#load-error-logs").addEventListener("click", () => {
        loadLogs(true);
    });

    document.querySelector("#logs-state").addEventListener("change", requestLoggerStateChange);
    document.querySelector("#log-highest-level").addEventListener("change", requestLoggerLevelChange);
}

function reverseLogList() {

    for (let i = 0; i < logTableBody.childNodes.length; i++) {
        logTableBody.insertBefore(logTableBody.childNodes[i], logTableBody.firstChild);
    }
}

function filterLogs(ev) {
    let filter;
    try {
        filter = new RegExp(ev.target.value);
        if (!filter || filter.length === 0) {
            return;
        }
    } catch (err) {
        return;
    }

    for (let i = 0; i < logTableBody.childNodes.length; i++) {

        let selectedField = parseInt(filterFieldSelector.options[filterFieldSelector.selectedIndex].value);
        let row = logTableBody.childNodes[i];
        let testingField;
        if (!isNaN(selectedField)) {
            testingField = row.children[selectedField] ? row.children[selectedField].innerHTML : "";
        } else {
            testingField = row.innerHTML;
        }
        filter.test(testingField) ? logTableBody.childNodes[i].classList.remove("log-row-hidden") : logTableBody.childNodes[i].classList.add("log-row-hidden");
    }
}

function clearLogs(ev) {
    let privKey = adminSession.privateKey;
    let pkfp = adminSession.pkfp;
    let ic = new iCrypto();
    ic.createNonce('n').setRSAKey("pk", privKey, 'private').privateKeySign('n', 'pk', 'sign').bytesToHex('n', 'nhex');

    $.ajax({
        type: "POST",
        url: "/admin",
        dataType: "json",
        data: {
            action: "clear_logs",
            nonce: ic.get('nhex'),
            sign: ic.get('sign'),
            pkfp: pkfp
        },
        success: () => {
            logTableBody.innerHTML = "";
            toastr.info("Log level have been cleared");
        },
        err: err => {
            toastr.warning("Error clearing logs: " + err);
        }
    });
}


function prepareRequestProcessor(adminSession){
    return function (data, onSuccess, onError){
        if (!data.action){
            throw "Malformed request"
        }
        let privKey = adminSession.privateKey;
        let pkfp = adminSession.pkfp;
        let ic = new iCrypto();
        ic.createNonce("n")
            .bytesToHex("n", "nhex");
        data.nonce = ic.get("nhex");
        let requestString = JSON.stringify(data);
        ic.addBlob('data', requestString)
            .setRSAKey("pk", privKey, 'private')
            .privateKeySign('data', 'pk', 'sign');
        $.ajax({
            type: "POST",
            url: "/admin",
            dataType: "json",
            data: {
                action: data.action,
                requestString: requestString,
                sign: ic.get('sign'),
                pkfp: pkfp
            },
            success: onSuccess,
            error: onError
        });
    };
}

