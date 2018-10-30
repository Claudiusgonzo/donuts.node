//-----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// Licensed under the MIT License. See License file under the project root for license information.
//-----------------------------------------------------------------------------

const utils = require("donuts.node/utils");
const { ChannelProxy } = require("./channel-proxy");
const { Log } = require("donuts.node/logging/log");

/** @typedef {import("child_process").ChildProcess} ChildProcess */
/** 
 * @template TChannel
 * @typedef {import("./channel-proxy").ChannelProxy<TChannel>} ChannelProxy
 */

/**
 * @class
 * @extends {ChannelProxy<ChildProcess>}
 */
class ProcessProxy extends ChannelProxy {
    // Process and ChildProcess share the same functions but ChildProcess has more detailed type information.
    //
    // Process:
    // https://nodejs.org/docs/latest-v8.x/api/process.html#process_process_send_message_sendhandle_options_callback
    // https://nodejs.org/docs/latest-v8.x/api/process.html#process_event_message
    //
    // ChildProcess:
    // https://nodejs.org/docs/latest-v8.x/api/child_process.html#child_process_event_message
    // https://nodejs.org/docs/latest-v8.x/api/child_process.html#child_process_subprocess_send_message_sendhandle_options_callback
    
    /**
     * @public
     * @param {*} channel 
     * @returns {channel is ChildProcess}
     */
    static isValidChannel(channel) {
        return !utils.isNullOrUndefined(channel)
            && utils.isFunction(channel.kill)
            && utils.isNumber(channel.pid)
            && utils.isFunction(channel.send)
            && utils.isFunction(channel.on)
            && utils.isFunction(channel.removeListener);
    }

    /**
     * @public
     * @returns {void}
     */
    dispose() {
        if (!this.disposed) {
            this.channel.removeListener("message", this.onMessage);
        }

        super.dispose();
    }

    /**
     * @public
     * @param {*} data 
     * @returns {boolean}
     */
    sendData(data) {
        if (this.disposed) {
            throw new Error("Channel proxy already disposed.");
        }

        return this.channel.send(JSON.stringify(data));
    }

    /**
     * 
     * @param {ChildProcess} channel 
     */
    constructor(channel) {
        super(channel);

        this.channel.on("message", this.onMessage);
    }

    /**
     * @private
     * @param {*} message
     */
    onMessage = (message) => {
        if (utils.isString(message)) {
            try {
                this.triggerDataHandler(JSON.parse(message));
            } catch (error) {
                Log.instance.writeExceptionAsync(error);
                throw error;
            }
        }
    }
}
exports.ProcessProxy = ProcessProxy;