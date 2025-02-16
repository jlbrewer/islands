const Err = require("../libs/IError.js");


class OutgoingPendingJoinRequest{
    constructor(pkfp = Err.required(),
                publicKey = Err.required(),
                hsid = Err.required(),
                hsPrivateKey = Err.required(),
                connectionId = Err.required(),
                ){
        this.pkfp = pkfp;
        this.publicKey = publicKey;
        this.hsid = hsid.substring(0, 16) + ".onion";
        this.hsPrivateKey = hsPrivateKey;
        this.connectionId = connectionId;
    }
}

module.exports = OutgoingPendingJoinRequest;