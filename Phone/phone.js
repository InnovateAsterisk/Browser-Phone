/* JavaScript for Raspberry Phone */

// phone.js
// Requires:
    // sip-0.11.6.js
    // 

// User may need to choose this:
var wssServer = "b827ebd13eb8.blueberrypbx.net"; // window.location.hostname; //"raspberrypi.local"; b827ebd13eb8.blueberrypbx.net
var profileUserID = "000000000000000";
var profileUser = "100";
var profileName = "Enter Name Here";
var WebSocketPort = 444; // 4443
var ServerPath = "/ws";
var SipUsername = "webrtc";
var SipPassword = "webrtc";

var userAgent = null;

var CallSessions = new Array();
var PreviousSessions = new Array();

var voicemailSubs = null;;
var BlfSubs = new Array();
var RemoteAudioMeters = new Array();
var LocalAudioMeters = new Array();
var CanvasCollection = new Array();
var Buddies = new Array();
var isReRegister = false;
var dhtmlxPopup = null;
var selectedBuddy = null;

// Window and Document Events
// ==========================
window.onbeforeunload = function () {
    Unregister();
    return null;
}
$(window).on('resize', function () {
    UpdateUI();
});
function UpdateUI(){
    var windowWidth = $(window).outerWidth();
    if(windowWidth < 920){
        console.log("Narrow Layout")

        if(selectedBuddy == null)
        {
            // Nobody Selected
            $("#rightContent").hide();

            $("#leftContent").css("width", "100%");
            $("#leftContent").show(300);
        } else {
            $("#rightContent").css("margin-left", "0px");
            $("#rightContent").show(300);

            $("#leftContent").hide(300);
        }
    } else {
        console.log("Widescreen Layout")

        if(selectedBuddy == null)
        {
            $("#leftContent").css("width", "100%");
            $("#rightContent").css("margin-left", "0px");
            $("#leftContent").show(300);
            $("#rightContent").hide(300);
        }
        else{
            $("#leftContent").css("width", "320px");
            $("#rightContent").css("margin-left", "320px");
            $("#leftContent").show(300);
            $("#rightContent").show(300);
        }

    }
}

// Document Ready
// ==============
$(document).ready(function () {
    UpdateUI();
    
    // Create User Agent
    // =================
    try {
        console.log("Creating User Agent...");
        userAgent = new SIP.UA({
            displayName: profileName,
            uri: SipUsername + "@" + wssServer,
            transportOptions: {
                wsServers: "wss://" + wssServer + ":"+ WebSocketPort +""+ ServerPath,
                traceSip: false,
                connectionTimeout: 15,
                maxReconnectionAttempts: 99,
                reconnectionTimeout: 15,
            },
            authorizationUser: SipUsername,
            password: SipPassword,
            registerExpires: 300,
            hackWssInTransport: true, // makes it transport=wss in Contact (Required for Asterisk as it doesnt support Path)
            // hackIpInContact: true,
            userAgentString: "Raspberry Phone (SipJS - 0.11.6)",
            keepAliveInterval: 59,
            autostart: false,
            register: false,
        });
        console.log("Creating User Agent... Done");
    }
    catch (e) {
        console.error("Error creating User Agent: "+ e);
        $("#regStatus").html("Error creating User Agent");
        alert(e.message);
        return;
    }

    // UA Register events
    // ==================
    userAgent.on('registered', function () {
        console.log("Registered!");
        $("#regStatus").html("Registered");

        $("#reglink").hide();
        $("#dereglink").show();

        // Start Subscribe Loop
        // ====================
        if(!isReRegister) Subscribe();
        isReRegister = true;
    });
    userAgent.on('registrationFailed', function (cause) {
        console.log("Registration Failed: " + cause);
        $("#regStatus").html("Registration Failed");

        $("#reglink").show();
        $("#dereglink").hide();
    });
    userAgent.on('unregistered', function () {
        console.log("Unregistered, bye!");
        $("#regStatus").html("Unregistered, bye!");

        $("#reglink").show();
        $("#dereglink").hide();
    });

    // UA transport
    // ============
    userAgent.on('transportCreated', function (transport) {
        console.log("Transport Object Created");
        
        // Transport Events
        // ================
        transport.on('connected', function () {
            console.log("Connected to Web Socket!");
            $("#regStatus").html("Connected to Web Socket!");

            $("#WebRtcFailed").hide();

            // Auto start register
            // ===================
            Register();
        });
        transport.on('disconnected', function (d) {
            console.log("Disconnected from Web Socket!"+ d.code);
            $("#regStatus").html("Disconnected from Web Socket!");
        });
        transport.on('transportError', function (e) {
            console.log("Web Socket error: "+ e);
            $("#regStatus").html("Web Socket error");

            $("#WebRtcFailed").show();
        });
    });

    // Inbound Calls
    // =============
    userAgent.on("invite", function (session) {
        ReceiveCall(session);
    });

    // Inbound Text Message
    // ====================
    userAgent.on('message', function (message) {
        ReceiveMessage(message);
    });

    // Start the WebService Connection loop
    // ====================================
    console.log("Connecting to Web Socket...");
    $("#regStatus").html("Connecting to Web Socket...");
    userAgent.start();
    
    // Register Buttons
    // ================
    $("#reglink").on('click', Register);
    $("#dereglink").on('click', Unregister);

    // WebRTC Error Page
    $("#WebRtcFailed").on('click', function(){
        Confirm("{{%error.WsConnectError%}}", "{{%error.WsError%}}", function(){
            window.open("https://"+ wssServer +":"+ WebSocketPort +"/httpstatus");
        }, null);
    });
});


$("#txtFindBuddy").on('keyup', function(event){
    // console.log(event);
    // console.log(this);
    UpdateBuddyList(this.value);
})


// Registration
// ============
function Register() {
    if (userAgent == null || userAgent.isRegistered()) return;

    console.log("Sending Registration...");
    $("#regStatus").html("Sending Registration...");
    userAgent.register()
}
function Unregister() {
    if (userAgent == null || !userAgent.isRegistered()) return;

    console.log("Unsubscribing...");
    $("#regStatus").html("Unsubscribing...");
    try {
        UnSubscribe();
    } catch (e) { }

    console.log("Disconnecting...");
    $("#regStatus").html("Disconnecting...");
    userAgent.unregister();

    isReRegister = false;
}

// Inbound Calls
// =============
function ReceiveCall(session) {
    console.log("New Incoing Call!");

    var callerID = session.remoteIdentity.displayName;

    var fromSipUri = "" + session.remoteIdentity.uri; //sip:200@192.168.88.98
    var buddy = fromSipUri.split("@")[0].split(":")[1];

    // Make content one of its not there
    // =================================

    // Handle the cancel events
    session.on('terminated', function(message, cause) {
        // $("#contact-" + buddy + "-msg").html("Caller Cancelled");
        teardownSession(buddy, session, 0, "Call Cancelled");
    });

    // Setup in-page call notification if you are on me already
    // ========================================================
    $("#contact-" + buddy + "-sipCallId").val(session.id);
    $("#contact-" + buddy + "-incomingCallerID").html(callerID);
    $("#contact-" + buddy + "-AnswerCall").show();

    // Play Ring Tone if not on the phone
    // ==================================
    // $("#contact-" + buddy + "-ringer").play();

    // Check if that buddy is not already on a call??
    // ==============================================
    var streamVisible = $("#stream-"+ buddy).is(":visible");
    if (streamVisible) {
        // Not sure if there is anything do do in this case
    } else {
        // Show Call Answer Window
        // =======================

        // Add a notification badge
        // ========================
        IncreaseMissedBadge(buddy);

        // Show notification
        // =================
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                var noticeOptions = { body: "You have an inbound call from: " + callerID }
                var inComingCallNotification = new Notification("Incoming Call", noticeOptions);
                inComingCallNotification.onclick = function (event) {
                    // Select Buddy
                    SelectBuddy(buddy);

                    // Answer Call
                    AnswerAudioCall(buddy);
                }
            }
        }
    }

    // Add to call session array
    // =========================
    addActiveSession(session, false);
}
function AnswerAudioCall(buddy) {

    var session = getSession(buddy);
    if (session != null) {
        wireupAudioSession(session, "inbound", buddy);
        session.accept();
        $("#contact-" + buddy + "-msg").html("Audo Call in Progress!");
    } else {
        $("#contact-" + buddy + "-msg").html("Audo Answer failed, null session");
    }
    $("#contact-" + buddy + "-AnswerCall").hide();
}
function AnswerVideoCall(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        wireupVideoSession(session, "inbound", buddy);
        session.accept();
        $("#contact-" + buddy + "-msg").html("Audo Call in Progress!");
    } else {
        $("#contact-" + buddy + "-msg").html("Video Answer failed, null session");
    }
    $("#contact-" + buddy + "-AnswerCall").hide();
}
function RejectCall(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        var rejectBusy = { statusCode: 486, reasonPhrase: "Busy Here" }
        session.reject(rejectBusy);
        $("#contact-" + buddy + "-msg").html("Call Rejected.");
    } else {
        $("#contact-" + buddy + "-msg").html("Call Reject failed, null session");
    }
    $("#contact-" + buddy + "-AnswerCall").hide();
    // teardownSession(buddy, session, 0, "Call Rejected");
}

// Session Wireup
// ==============
function wireupAudioSession(session, typeStr, buddy) {
    // Note: Each contact/Buddy/Etc can be called and can call you only once.
    // There is only one audio object per contact... this is based on the premis that
    // you would only call someone once, or they would only call you once.
    // I.E. you are already on the phone with them.
    // There exists a small posibility that a large company displaying that same callerid
    // for all outging calls, calls into you, and this system sees this as the same caller 
    // to the same destination... yes well this is a limitation.

    if (session == null) return;

    var MessageObjId = "#contact-" + buddy + "-msg";

    $("#contact-" + buddy + "-sipCallId").val(session.id);

    session.on('progress', function (response) {
        $(MessageObjId).html("Ringing...");

        // Handle Early Media
        /*
        if (response.status_code === 183 && response.body && session.hasOffer && !session.dialog) {
            if (!response.hasHeader('require') || response.getHeader('require').indexOf('100rel') === -1) {
                session.mediaHandler.setDescription(response.body).then(function onSuccess() {
                    session.status = SIP.Session.C.STATUS_EARLY_MEDIA;
                    session.mute();
                }, function onFailure(e) {
                    session.logger.warn(e);
                    session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
                    session.failed(response, SIP.C.causes.BAD_MEDIA_DESCRIPTION);
                });
            }
        }
        */
    });
    session.on('trackAdded', function () {
        var pc = session.sessionDescriptionHandler.peerConnection;

        // Gets remote tracks
        // ==================
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            try {
                remoteStream.addTrack(receiver.track);
            } catch (e) {
                console.error(e);
            }
        });
        var remoteAudio = $("#contact-" + buddy + "-remoteAudio").get(0);
        remoteAudio.srcObject = remoteStream;
        remoteAudio.setSinkId($("#audioOutput").val());
        remoteAudio.play();
        StartRemoteAudioMediaMonitoring(remoteStream, buddy, session);

        // Get your Local track
        // ====================
        var localStream = new MediaStream();
        pc.getSenders().forEach(function (sender) {
            try{
                localStream.addTrack(sender.track);
            } catch (e) {
                console.error(e);
            }
        });
        StartLocalAudioMediaMonitoring(localStream, buddy, session);
    });
    session.on('accepted', function (data) {
        $(MessageObjId).html("Audo Call in Progress!");

        $("#contact-" + buddy + "-progress").hide();

        $("#contact-" + buddy + "-VideoCall").hide();
        $("#contact-" + buddy + "-AudioCall").show();

        $("#contact-" + buddy + "-ActiveCall").show();
    });
    session.on('rejected', function (response, cause) {
        $(MessageObjId).html("Call rejected: " + cause);
        teardownSession(buddy, session, response.status_code, response.reason_phrase);
    });
    session.on('failed', function (response, cause) {
        $(MessageObjId).html("Call failed: " + cause);
        teardownSession(buddy, session, 0, "Call failed");
    });
    session.on('cancel', function () {
        $(MessageObjId).html("Call Cancelled");
        teardownSession(buddy, session, 0, "Cancelled by caller");
    });
    // referRequested
    // replaced
    session.on('bye', function () {
        $(MessageObjId).html("Call ended, bye!");
        teardownSession(buddy, session, 16, "Normal Call clearing");
    });
    session.on('terminated', function (message, cause) {
        console.log("session terminated, fyi: " + cause);
    });
    session.on('reinvite', function (session) {
        console.log("session reinviited!");
    });
    // dtmf

    $("#contact-" + buddy + "-btn-settings").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-shareFiles").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-audioCall").attr('disabled', 'disabled');
    $("#contact-" + buddy + "-btn-videoCall").attr('disabled', 'disabled');
    $("#contact-" + buddy + "-btn-search").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-remove").attr('disabled', 'disabled');

    $("#contact-" + buddy + "-progress").show();
    $("#contact-" + buddy + "-msg").show();

    if(typeStr == "group") {
        $("#contact-" + buddy + "-conference").show();
        MonitorBuddyConference(buddy);
    }
    else 
    {
        $("#contact-" + buddy + "-conference").show();
    }
}
function wireupVideoSession(session, typeStr, buddy) {
    if (session == null) return;

    var MessageObjId = "#contact-" + buddy + "-msg";

    $("#contact-" + buddy + "-sipCallId").val(session.id);

    session.on('trackAdded', function () {
        var pc = session.sessionDescriptionHandler.peerConnection;

        // Gets remote tracks
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            try{
                remoteStream.addTrack(receiver.track);
            } catch (e) {
                console.error(e);
            }
        });
        var remoteVideo = $("#contact-" + buddy + "-remoteVideo").get(0);
        remoteVideo.srcObject = remoteStream;
        remoteVideo.setSinkId($("#audioOutput").val()); // Output device
        remoteVideo.play();
        StartRemoteAudioMediaMonitoring(remoteStream, buddy, session);

        // Review Video
        var localStream = new MediaStream();
        pc.getSenders().forEach(function (sender) {
            try{
                localStream.addTrack(sender.track);
            } catch (e) {
                console.error(e);
            }
        });
        var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
        localVideo.srcObject = localStream;
        localVideo.play();
        StartLocalAudioMediaMonitoring(localStream, buddy, session);
    });
    session.on('progress', function (response) {
        $(MessageObjId).html("Ringing...");

        // Handle Early Media
        /*
        if (response.status_code === 183 && response.body && session.hasOffer && !session.dialog) {
            if (!response.hasHeader('require') || response.getHeader('require').indexOf('100rel') === -1) {
                session.mediaHandler.setDescription(response.body).then(function onSuccess() {
                    session.status = SIP.Session.C.STATUS_EARLY_MEDIA;
                    session.mute();
                }, function onFailure(e) {
                    session.logger.warn(e);
                    session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
                    session.failed(response, SIP.C.causes.BAD_MEDIA_DESCRIPTION);
                });
            }
        }
        */
    });
    session.on('accepted', function (data) {
        $(MessageObjId).html("Call in Progress!");

        $("#contact-" + buddy + "-progress").hide();

        $("#contact-" + buddy + "-VideoCall").show();
        $("#contact-" + buddy + "-AudioCall").hide();

        $("#contact-" + buddy + "-ActiveCall").show();
    });
    session.on('rejected', function (response, cause) {
        $(MessageObjId).html("Call rejected: "+ cause);
        teardownSession(buddy, session, response.status_code, response.reason_phrase);
    });
    session.on('failed', function (response, cause) {
        $(MessageObjId).html("Call failed: "+ cause);
        teardownSession(buddy, session, 0, "call failed");
    });
    session.on('cancel', function () {
        $(MessageObjId).html("Call Cancelled");
        teardownSession(buddy, session, 0, "Cancelled by caller");
    });
    // referRequested
    // replaced
    session.on('bye', function () {
        $(MessageObjId).html("Call ended, bye!");
        teardownSession(buddy, session, 16, "Normal Call clearing");
    });
    session.on('terminated', function (message, cause) {
        console.log("terminated, fyi: " + cause);
    });
    session.on('reinvite', function (session) {
        console.log("session reinviited!");
    });
    // dtmf

    $("#contact-" + buddy + "-btn-settings").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-shareFiles").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-audioCall").attr('disabled','disabled');
    $("#contact-" + buddy + "-btn-videoCall").attr('disabled','disabled');
    $("#contact-" + buddy + "-btn-search").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-remove").attr('disabled','disabled');

    $("#contact-" + buddy + "-progress").show();
    $("#contact-" + buddy + "-msg").show();
}
function teardownSession(buddy, session, reasonCode, reasonText) {
    // Audio Meters
    // ============
    for (var a = 0; a < RemoteAudioMeters.length; a++) {
        try{
            var soundMeter = RemoteAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("Clearing Audio Levels Interval for call: " + session.id);

                // Clear Interval
                window.clearInterval(soundMeter.levelsInterval);
                window.clearInterval(soundMeter.networkInterval);

                // Teardown charts
                if(soundMeter.ReceiveBitRateChart != null) soundMeter.ReceiveBitRateChart.destroy();
                if(soundMeter.ReceivePacketRateChart != null) soundMeter.ReceivePacketRateChart.destroy();
                if(soundMeter.ReceivePacketLossChart != null) soundMeter.ReceivePacketLossChart.destroy();
                if(soundMeter.ReceiveJitterChart != null) soundMeter.ReceiveJitterChart.destroy();
                if(soundMeter.ReceiveLevelsChart != null) soundMeter.ReceiveLevelsChart.destroy();

                // Stop Script
                soundMeter.stop();
                soundMeter = null;
                RemoteAudioMeters.splice(a, 1); // Actual Remove

                // continue; // Check all of them
            }
        } catch(e){
            // nulled already
        }
    }
    $("#contact-" + buddy + "-Speaker").css("height", "0%");

    for (var a = 0; a < LocalAudioMeters.length; a++) {
        try{
            var soundMeter = LocalAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("Clearing Audio Levels Interval for call: " + session.id);

                // Clear Interval
                window.clearInterval(soundMeter.levelsInterval);
                window.clearInterval(soundMeter.networkInterval);

                // Teardown charts
                if(soundMeter.SendBitRateChart != null) soundMeter.SendBitRateChart.destroy();
                if(soundMeter.SendPacketRateChart != null) soundMeter.SendPacketRateChart.destroy();

                // Stop Script
                soundMeter.stop();
                soundMeter = null;
                LocalAudioMeters.splice(a, 1); // Actual Remove

                // continue;
            }
        } catch(e){
            // nulled already
        }
    }
    $("#contact-" + buddy + "-Mic").css("height", "0%");

    // Remove the session
    // ===================
    $("#contact-" + buddy + "-sipCallId").val("");
    removeSession(session);

    $("#contact-" + buddy + "-scratchpad-container").hide();
    $("#contact-" + buddy + "-sharevideo-contaner").hide();

    // Add to stream
    // =============
    AddCallMessage(buddy, "Call with " + buddy + " ended: " + reasonText + " (" + reasonCode + ")");

    // Close up the UI
    // ===============
    window.setTimeout(function () {
        $("#contact-" + buddy + "-btn-settings").removeAttr('disabled');
        $("#contact-" + buddy + "-btn-shareFiles").removeAttr('disabled');
        $("#contact-" + buddy + "-btn-audioCall").removeAttr('disabled');
        $("#contact-" + buddy + "-btn-videoCall").removeAttr('disabled');
        $("#contact-" + buddy + "-btn-search").removeAttr('disabled');
        $("#contact-" + buddy + "-btn-remove").removeAttr('disabled');

        $("#contact-" + buddy + "-progress").hide();

        $("#contact-" + buddy + "-ActiveCall").hide();
        $("#contact-" + buddy + "-AnswerCall").hide();

        $("#contact-" + buddy + "-msg").hide();
    }, 1000);
}

// Conference Monitor
// ==================
function MonitorBuddyConference(buddy){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj.type == "group"){
        var server = "wss://"+ wssServer + ":65501";
        console.log("Connecting to WebSocket Server: "+ server);
        var websocket = new WebSocket(server);
        websocket.onopen = function(evt) { 
            console.warn("WebSocket Connection Open, sending subscribe...");
            websocket.send("<xml><subscribe>Confbridge</subscribe></xml>");
        }
        websocket.onclose = function(evt) { 
            console.warn("WebSocket Closed");
        }
        websocket.onmessage = function(evt) { 
            var JsonEvent = JSON.parse("{}");
            try{
                JsonEvent = JSON.parse(evt.data);
            }catch(e){}

            // JsonEvent.Conference
            // JsonEvent.Channel
            // JsonEvent.TalkingStatus: "on" | "off"
            // JsonEvent.Event: "ConfbridgeStart" | "ConfbridgeJoin" | "ConfbridgeTalking" | "ConfbridgeLeave" | "ConfbridgeEnd"
            // CallerIDName: "Alfredo Dixon"
            // CallerIDNum: "800"

            if(JsonEvent.Conference == buddyObj.identity) {

                console.log(JsonEvent);

                var mutedHTML = "Muted: <span style=\"color:red\"><i class=\"fa fa-microphone-slash\"></i> Yes</span>"
                var unMutedHTML = "Muted: <span style=\"color:green\"><i class=\"fa fa-microphone-slash\"></i> No</span>"

                var channel = (JsonEvent.Channel)? JsonEvent.Channel : ""; // Local/" + attendee.LocalDialNumber + "@from-extensions | SIP/webrtc-00000007
                if(channel.indexOf("@") > -1) channel = channel.split("@")[0]; // Local/+24524352 | Local/800 | SIP/name-00000000
                if(channel.indexOf("/") > -1) channel = channel.split("/")[1]; // 800 | name-000000000 | +24524352
                if(channel.indexOf("-") > -1) channel = channel.split("-")[0]; // 800 | name | +24524352
                if(channel.indexOf("+") > -1) channel = channel.split("+")[1]; // 800 | name | 24524352

                if(JsonEvent.Event == "ConfbridgeStart"){
                    $("#contact-" + buddy + "-conference").empty();
                }
                else if(JsonEvent.Event == "ConfbridgeJoin") {

                    var isMuted = (JsonEvent.Muted != "No");

                    console.log("Buddy: "+ JsonEvent.CallerIDNum +" Joined Conference "+ JsonEvent.Conference);
                    var html = "<div id=\"cp-"+ JsonEvent.Conference +"-"+ channel +"\" class=ConferenceParticipant>"
                    html += " <IMG id=picture class=NotTalking src=\"/api/img/?action=GetUserPicture&e="+ JsonEvent.CallerIDNum +"&MaxSize=64\">";
                    html += " <div>" + JsonEvent.CallerIDNum +" - "+ JsonEvent.CallerIDName +"</div>";
                    html += (JsonEvent.Muted == "No")? "<div class=presenceText id=Muted>" + unMutedHTML +"</div>" : "<div class= id=Muted>" + mutedHTML +"</div>";
                    html += "</div>";
                    $("#contact-" + buddy + "-conference").append(html);
                }
                else if(JsonEvent.Event == "ConfbridgeTalking") {
                    if(JsonEvent.TalkingStatus == "on"){
                        console.log("Buddy: "+ JsonEvent.CallerIDNum +" is Talking in Conference "+ JsonEvent.Conference);
                        $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #picture").attr("class", "Talking");
                    }
                    else {
                        console.log("Buddy: "+ JsonEvent.CallerIDNum +" is Not Talking in Conference "+ JsonEvent.Conference);
                        $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #picture").attr("class", "NotTalking");
                    }
                }
                else if(JsonEvent.Event == "ConfbridgeLeave") {
                    console.log("Buddy: "+ JsonEvent.CallerIDNum +" Left Conference "+ JsonEvent.Conference);
                    $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel).remove();
                }
                else if(JsonEvent.Event == "ConfbridgeMute") {
                    $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #Muted").html(mutedHTML);
                    
                }
                else if(JsonEvent.Event == "ConfbridgeUnmute") {
                    $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #Muted").html(unMutedHTML);
                }
                else if(JsonEvent.Event == "ConfbridgeEnd") {
                    console.log("Conference "+ buddyObj.identity +" ended, closing WebSocket");
                    websocket.close(1000);
                }
                //ConfbridgeList
                //ConfbridgeMute
                //ConfbridgeRecord
                //ConfbridgeStopRecord
            }
        }
        websocket.onerror = function(evt) { 
            console.error("WebSocket Error: "+ evt.data);
        }

        // Get the Group Details via API first
        $("#contact-" + buddy + "-conference").empty();

    }
    else {
        console.log("Somehow this is not a Group, so cant monitor the conference");
    }
}

// Mic and Speaker Levels
// ======================
function StartRemoteAudioMediaMonitoring(stream, buddy, session) {
    for (var a = 0; a < RemoteAudioMeters.length; a++) {
        try{
            var soundMeter = RemoteAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("RemoteAudio AudioContext alerady existing for call: " + session.id);

                // Clear Interval
                window.clearInterval(soundMeter.levelsInterval);
                window.clearInterval(soundMeter.networkInterval);

                // Teardown charts
                if(soundMeter.ReceiveBitRateChart != null) soundMeter.ReceiveBitRateChart.destroy();
                if(soundMeter.ReceivePacketRateChart != null) soundMeter.ReceivePacketRateChart.destroy();
                if(soundMeter.ReceivePacketLossChart != null) soundMeter.ReceivePacketLossChart.destroy();
                if(soundMeter.ReceiveJitterChart != null) soundMeter.ReceiveJitterChart.destroy();
                if(soundMeter.ReceiveLevelsChart != null) soundMeter.ReceiveLevelsChart.destroy();

                // Stop Script
                soundMeter.stop();
                soundMeter = null;
                RemoteAudioMeters.splice(a, 1); // Actual Remove
            }
        } catch(e){
            // nulled already
        }
    }

    console.log("Creating RemoteAudio AudioContext for call with " + buddy);

    // Create AudioContext
    // ===================
    try {
        var audioContext = new AudioContext();
    }
    catch(e){
        console.warn("AudioContext() RemoteAudio not available... it fine.")
        console.error(e)

        return;
    }
    // Create local SoundMeter
    // =======================
    var soundMeter = new SoundMeter(audioContext, session.id, buddy);

    // Setup Charts
    // ============
    var maxDataLength = 100;
    soundMeter.startTime = Date.now();
    Chart.defaults.global.defaultFontSize = 12;

    var ChatHistoryOptions = { 
        responsive: false,
        maintainAspectRatio: false,
        devicePixelRatio: 1,
        animation: false,
        scales: {
            yAxes: [{
                ticks: { beginAtZero: true } //, min: 0, max: 100
            }]
        }, 
    }

    soundMeter.ReceiveBitRateChart = new Chart($("#contact-"+ buddy +"-AudioReceiveBitRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: "Receive Kilobits per second",
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(168, 0, 0, 0.5)',
                borderColor: 'rgba(168, 0, 0, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });
    soundMeter.ReceiveBitRateChart.lastValueBytesReceived = 0;
    soundMeter.ReceiveBitRateChart.lastValueTimestamp = 0;

    soundMeter.ReceivePacketRateChart = new Chart($("#contact-"+ buddy +"-AudioReceivePacketRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: "Receive Packets per second",
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(168, 0, 0, 0.5)',
                borderColor: 'rgba(168, 0, 0, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });
    soundMeter.ReceivePacketRateChart.lastValuePacketReceived = 0;
    soundMeter.ReceivePacketRateChart.lastValueTimestamp = 0;

    soundMeter.ReceivePacketLossChart = new Chart($("#contact-"+ buddy +"-AudioReceivePacketLoss"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: "Receive Packet Loss",
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(168, 99, 0, 0.5)',
                borderColor: 'rgba(168, 99, 0, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });
    soundMeter.ReceivePacketLossChart.lastValuePacketLoss = 0;
    soundMeter.ReceivePacketLossChart.lastValueTimestamp = 0;

    soundMeter.ReceiveJitterChart = new Chart($("#contact-"+ buddy +"-AudioReceiveJitter"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: "Receive Jitter",
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(0, 38, 168, 0.5)',
                borderColor: 'rgba(0, 38, 168, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });

    soundMeter.ReceiveLevelsChart = new Chart($("#contact-"+ buddy +"-AudioReceiveLevels"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: "Receive Audio Levels",
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(140, 0, 168, 0.5)',
                borderColor: 'rgba(140, 0, 168, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });

    // Connect to Source
    // =================
    soundMeter.connectToSource(stream, function (e) {
        if (e != null) return;

        // Ready the getStats request
        // ==========================
        var audioReceiver = null;
        session.sessionDescriptionHandler.peerConnection.getReceivers().forEach(function (RTCRtpReceiver) {
            if(audioReceiver == null)
            {
                // getContributingSources()
                var mediaStreamTrack = RTCRtpReceiver.track;
                if(mediaStreamTrack.kind == "audio") audioReceiver = RTCRtpReceiver;
            }
        });

        // Create remote SoundMeter
        // ========================
        console.log("SoundMeter for RemoteAudio Connected, displaying levels for: " + buddy);
        soundMeter.levelsInterval = window.setInterval(function () {
            // soundMeter.slow
            // soundMeter.clip;

            // Calculate Levels
            // ================
            //value="0" max="1" high="0.25" (this seems low... )
            var level = soundMeter.instant * 4.0;
            if (level > 1) level = 1;
            var instPercent = level * 100;

            // console.log("Output from " + buddy + " : " + level.toFixed(2) +" ("+ instPercent.toFixed(2) +"%)");
            $("#contact-" + buddy + "-Speaker").css("height", instPercent.toFixed(2) +"%");
        }, 200);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            // ============================
            if(audioReceiver != null)
            {
                audioReceiver.getStats().then(function(stats) {
                    stats.forEach(function(report){

                        var ReceiveBitRateChart = soundMeter.ReceiveBitRateChart;
                        var ReceivePacketRateChart = soundMeter.ReceivePacketRateChart;
                        var ReceivePacketLossChart = soundMeter.ReceivePacketLossChart;
                        var ReceiveJitterChart = soundMeter.ReceiveJitterChart;
                        var ReceiveLevelsChart = soundMeter.ReceiveLevelsChart;
                        var elapsedSec = Math.floor((Date.now() - soundMeter.startTime)/1000);

                        if(report.type == "inbound-rtp"){

                            if(ReceiveBitRateChart.lastValueTimestamp == 0) {
                                ReceiveBitRateChart.lastValueTimestamp = report.timestamp;
                                ReceiveBitRateChart.lastValueBytesReceived = report.bytesReceived;

                                ReceivePacketRateChart.lastValueTimestamp = report.timestamp;
                                ReceivePacketRateChart.lastValuePacketReceived = report.packetsReceived;

                                ReceivePacketLossChart.lastValueTimestamp = report.timestamp;
                                ReceivePacketLossChart.lastValuePacketLoss = report.packetsLost;

                                return;
                            }
                            // Receive Kilobits Per second
                            // ===========================
                            var kbitsPerSec = (8 * (report.bytesReceived - ReceiveBitRateChart.lastValueBytesReceived))/1000;

                            ReceiveBitRateChart.lastValueTimestamp = report.timestamp;
                            ReceiveBitRateChart.lastValueBytesReceived = report.bytesReceived;

                            ReceiveBitRateChart.data.datasets[0].data.push(kbitsPerSec);
                            ReceiveBitRateChart.data.labels.push("");
                            if(ReceiveBitRateChart.data.datasets[0].data.length > maxDataLength)
                            {
                                ReceiveBitRateChart.data.datasets[0].data.splice(0,1);
                                ReceiveBitRateChart.data.labels.splice(0,1);
                            }
                            ReceiveBitRateChart.update();

                            // Receive Packets Per Second
                            // ==========================
                            var PacketsPerSec = (report.packetsReceived - ReceivePacketRateChart.lastValuePacketReceived);

                            ReceivePacketRateChart.lastValueTimestamp = report.timestamp;
                            ReceivePacketRateChart.lastValuePacketReceived = report.packetsReceived;

                            ReceivePacketRateChart.data.datasets[0].data.push(PacketsPerSec);
                            ReceivePacketRateChart.data.labels.push("");
                            if(ReceivePacketRateChart.data.datasets[0].data.length > maxDataLength)
                            {
                                ReceivePacketRateChart.data.datasets[0].data.splice(0,1);
                                ReceivePacketRateChart.data.labels.splice(0,1);
                            }
                            ReceivePacketRateChart.update();

                            // Receive Packet Loss
                            // ===================
                            var PacketsLost = (report.packetsLost - ReceivePacketLossChart.lastValuePacketLoss);

                            ReceivePacketLossChart.lastValueTimestamp = report.timestamp;
                            ReceivePacketLossChart.lastValuePacketLoss = report.packetsLost;

                            ReceivePacketLossChart.data.datasets[0].data.push(PacketsLost);
                            ReceivePacketLossChart.data.labels.push("");
                            if(ReceivePacketLossChart.data.datasets[0].data.length > maxDataLength)
                            {
                                ReceivePacketLossChart.data.datasets[0].data.splice(0,1);
                                ReceivePacketLossChart.data.labels.splice(0,1);
                            }
                            ReceivePacketLossChart.update();

                            // Receive Jitter
                            // ==============
                            ReceiveJitterChart.data.datasets[0].data.push(report.jitter);
                            ReceiveJitterChart.data.labels.push("");
                            if(ReceiveJitterChart.data.datasets[0].data.length > maxDataLength)
                            {
                                ReceiveJitterChart.data.datasets[0].data.splice(0,1);
                                ReceiveJitterChart.data.labels.splice(0,1);
                            }
                            ReceiveJitterChart.update();
                        }
                        if(report.type == "track")
                        {
                            // console.log("Audio Receiver: "+ report.audioLevel);

                            // Receive Audio Levels
                            // ====================
                            var levelPercent = (report.audioLevel * 100)
                            ReceiveLevelsChart.data.datasets[0].data.push(levelPercent);
                            ReceiveLevelsChart.data.labels.push("");
                            if(ReceiveLevelsChart.data.datasets[0].data.length > maxDataLength)
                            {
                                ReceiveLevelsChart.data.datasets[0].data.splice(0,1);
                                ReceiveLevelsChart.data.labels.splice(0,1);
                            }
                            ReceiveLevelsChart.update();
                        }
                    });
                });
            }        
        } ,1000);
        RemoteAudioMeters[RemoteAudioMeters.length] = soundMeter;
    });
}
function StartLocalAudioMediaMonitoring(stream, buddy, session) {
    for (var a = 0; a < LocalAudioMeters.length; a++) {
        try{
            var soundMeter = LocalAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("LocalAudio AudioContext alerady existing for call: " + session.id);

                // Clear Interval
                window.clearInterval(soundMeter.levelsInterval);
                window.clearInterval(soundMeter.networkInterval);

                // Teardown charts
                if(soundMeter.SendBitRateChart != null) soundMeter.SendBitRateChart.destroy();
                if(soundMeter.SendPacketRateChart != null) soundMeter.SendPacketRateChart.destroy();

                // Stop Script
                soundMeter.stop();
                soundMeter = null;
                LocalAudioMeters.splice(a, 1); // Actual Remove
            }
        } catch(e){
            // nulled already
        }
    }
    console.log("Creating LocalAudio AudioContext for call with " + buddy);

    // Create AudioContext
    // ===================
    try {
        var audioContext = new AudioContext();
    }
    catch(e){
        console.warn("AudioContext() LocalAudio not available... it fine.")
        console.error(e)

        return;
    }

    // Ready the getStats request
    // ==========================
    var audioSender = null;
    session.sessionDescriptionHandler.peerConnection.getSenders().forEach(function (RTCRtpSender) {
        if(audioSender == null)
        {
            var mediaStreamTrack = RTCRtpSender.track;
            if(mediaStreamTrack.kind == "audio") audioSender = RTCRtpSender;
        } else{
            console.log("Found another Track, but audioSender not null");
            console.log(RTCRtpSender);
            console.log(RTCRtpSender.track);
        }
    });

    // Create local SoundMeter
    // =======================
    var soundMeter = new SoundMeter(audioContext, session.id, buddy);

    // Setup Charts
    // ============
    var maxDataLength = 100;
    soundMeter.startTime = Date.now();
    Chart.defaults.global.defaultFontSize = 12;
    var ChatHistoryOptions = { 
        responsive: false,    
        maintainAspectRatio: false,
        devicePixelRatio: 1,
        animation: false,
        scales: {
            yAxes: [{
                ticks: { beginAtZero: true }
            }]
        }, 
    }

    soundMeter.SendBitRateChart = new Chart($("#contact-"+ buddy +"-AudioSendBitRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: 'Send Kilobits Per Second',
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(0, 121, 19, 0.5)',
                borderColor: 'rgba(0, 121, 19, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });
    soundMeter.SendBitRateChart.lastValueBytesSent = 0;
    soundMeter.SendBitRateChart.lastValueTimestamp = 0;

    soundMeter.SendPacketRateChart = new Chart($("#contact-"+ buddy +"-AudioSendPacketRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: 'Send Packets Per Second',
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(0, 121, 19, 0.5)',
                borderColor: 'rgba(0, 121, 19, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });
    soundMeter.SendPacketRateChart.lastValuePacketSent = 0;
    soundMeter.SendPacketRateChart.lastValueTimestamp = 0;    

    // Connect to Source
    // =================
    soundMeter.connectToSource(stream, function (e) {
        if (e != null) return;

        console.log("SoundMeter for LocalAudio Connected, displaying levels for: " + buddy);
        soundMeter.levelsInterval = window.setInterval(function () {
            // soundMeter.slow
            // soundMeter.clip;

            // Calculate Levels
            // ================
            //value="0" max="1" high="0.25" (this seems low... )
            var level = soundMeter.instant * 4.0;
            if (level > 1) level = 1;
            var instPercent = level * 100;

            // console.log("Mic from " + buddy + " : " + level.toFixed(2) +" ("+ instPercent.toFixed(2) +"%)");
            $("#contact-" + buddy + "-Mic").css("height", instPercent.toFixed(2) +"%");
        }, 200);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            // ============================
            // Sending Audio Track
            if(audioSender != null)
            {
                audioSender.getStats().then(function(stats) {
                    stats.forEach(function(report){

                        var SendBitRateChart = soundMeter.SendBitRateChart;
                        var SendPacketRateChart = soundMeter.SendPacketRateChart;
                        var elapsedSec = Math.floor((Date.now() - soundMeter.startTime)/1000);

                        if(report.type == "outbound-rtp"){

                            if(SendBitRateChart.lastValueTimestamp == 0) {
                                SendBitRateChart.lastValueTimestamp = report.timestamp;
                                SendBitRateChart.lastValueBytesSent = report.bytesSent;

                                SendPacketRateChart.lastValueTimestamp = report.timestamp;
                                SendPacketRateChart.lastValuePacketSent = report.packetsSent;
                                return;
                            }

                            // Send Kilobits Per second
                            // ========================
                            var kbitsPerSec = (8 * (report.bytesSent - SendBitRateChart.lastValueBytesSent))/1000;

                            SendBitRateChart.lastValueTimestamp = report.timestamp;
                            SendBitRateChart.lastValueBytesSent = report.bytesSent;

                            SendBitRateChart.data.datasets[0].data.push(kbitsPerSec);
                            SendBitRateChart.data.labels.push("");
                            if(SendBitRateChart.data.datasets[0].data.length > maxDataLength)
                            {
                                SendBitRateChart.data.datasets[0].data.splice(0,1);
                                SendBitRateChart.data.labels.splice(0,1);
                            }
                            SendBitRateChart.update();

                            // Send Packets Per Second
                            // =======================
                            var PacketsPerSec = report.packetsSent - SendPacketRateChart.lastValuePacketSent;

                            SendPacketRateChart.lastValueTimestamp = report.timestamp;
                            SendPacketRateChart.lastValuePacketSent = report.packetsSent;

                            SendPacketRateChart.data.datasets[0].data.push(PacketsPerSec);
                            SendPacketRateChart.data.labels.push("");
                            if(SendPacketRateChart.data.datasets[0].data.length > maxDataLength)
                            {
                                SendPacketRateChart.data.datasets[0].data.splice(0,1);
                                SendPacketRateChart.data.labels.splice(0,1);
                            }
                            SendPacketRateChart.update();

                        }
                        if(report.type == "track")
                        {
                            // Bug/security consern... this seems always to report "0"
                            // Possible reason: When applied to isolated streams, media metrics may allow an application to infer some characteristics of the isolated stream, such as if anyone is speaking (by watching the audioLevel statistic).
                            // console.log("Audio Sender: " + report.audioLevel);
                        }
                    });
                });
            }

        } ,1000);

        LocalAudioMeters[LocalAudioMeters.length] = soundMeter;
    });
}
var MakeDataArray = function (defaultValue, count){
    var rtnArray = new Array(count);
    for(var i=0; i< rtnArray.length; i++)
    {
        rtnArray[i] = defaultValue;
    }
    return rtnArray;
}

// Sounds Meter Class
// ==================
function SoundMeter(context, sessionId, buddy) {
    this.buddy = buddy;
    this.sessionId = sessionId;

    this.levelsInterval = null;
    this.networkInterval = null;
    
    this.startTime = 0;

    this.ReceiveBitRateChart = null;
    this.ReceivePacketRateChart = null;
    this.ReceivePacketLossChart = null;
    this.ReceiveJitterChart = null;
    this.ReceiveLevelsChart = null;

    this.SendBitRateChart = null;
    this.SendPacketRateChart = null;

    this.context = context;
    this.instant = 0.0;
    this.slow = 0.0;
    this.clip = 0.0;
    this.script = context.createScriptProcessor(2048, 1, 1);
    const that = this;
    this.script.onaudioprocess = function(event) {
      const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
            if (Math.abs(input[i]) > 0.99) {
                clipcount += 1;
            }
        }
        that.instant = Math.sqrt(sum / input.length);
        that.slow = 0.95 * that.slow + 0.05 * that.instant;
        that.clip = clipcount / input.length;
    };
}
SoundMeter.prototype.connectToSource = function(stream, callback) {
    console.log("SoundMeter connecting...");
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
        callback(null);
    } catch (e) {
        // console.error(e); // Probably not audio track
        callback(e);
    }
}
SoundMeter.prototype.stop = function () {
    console.log("Disconnecting SoundMeter...");

    this.mic.disconnect();
    this.script.disconnect();

    this.mic = null;
    this.script = null;
    this.context = null;
}

// Presence / Subscribe
// ====================
function Subscribe() {
    var myAuth = $("#authname").val();

    console.log("Subscribe to voicemail Messages...");

    // Voicemail notice
    var vmOptions = { expires: 300 };
    voicemailSubs = userAgent.subscribe(myAuth + "@" + wssServer, 'message-summary', vmOptions); // message-summary = voicemail messages
    voicemailSubs.on('notify', function (notification) {
        // $("#msg").html("You have voicemail: \n" + notification.request.body);
        console.log("You have voicemail: \n" + notification.request.body);
    });

    // =======
    // Buddies
    // =======

    console.log("Clearing Buddies...");
    Buddies = new Array();

    console.log("Adding Buddies...");

    var json = {"Action":"GetUserBuddies","StatusDescription":"OK","StatusCode":200,"RequesterIP":"192.168.88.22","Username":"conrad@blueberrypbx.com","InputParameters":{"uID":"8D68B3EFEC8D0F5"},"StartExecute":"2020-02-08 07:55:15 UTC","ExecuteTimeSec":0.036685999999999996,"TotalRows":8,"DataCollection":[{"Type":"extension","LastActivity":"2019-03-04 10:55:30 UTC","ExtensionNumber":"800","MobileNumber":"","ContactNumber1":null,"ContactNumber2":null,"uID":"8D68C1D442A96B4","cID":null,"gID":null,"DisplayName":"Alfredo Dixon","Position":"General Manager","Description":null,"MemberCount":0},{"Type":"extension","LastActivity":"2019-03-03 10:55:30 UTC","ExtensionNumber":"500","MobileNumber":"","ContactNumber1":null,"ContactNumber2":null,"uID":"8D68C1D312CB133","cID":null,"gID":null,"DisplayName":"Clayton Dillon","Position":"Sales Person","Description":null,"MemberCount":0},{"Type":"extension","LastActivity":"2019-03-02 10:55:30 UTC","ExtensionNumber":"700","MobileNumber":"","ContactNumber1":null,"ContactNumber2":null,"uID":"8D68C1D3E323FA9","cID":null,"gID":null,"DisplayName":"Damian Duran","Position":"Support","Description":null,"MemberCount":0},{"Type":"contact","LastActivity":"2019-02-28 13:55:20 UTC","ExtensionNumber":null,"MobileNumber":null,"ContactNumber1":"+27837977605","ContactNumber2":"","uID":null,"cID":"8D68C1D442A96B5","gID":null,"DisplayName":"Jackson Payne","Position":null,"Description":"Manager","MemberCount":0},{"Type":"extension","LastActivity":"2019-02-10 09:45:20 UTC","ExtensionNumber":"300","MobileNumber":"+27837977605","ContactNumber1":null,"ContactNumber2":null,"uID":"8D68C1D20481FF5","cID":null,"gID":null,"DisplayName":"Laylah Williamson","Position":"Support","Description":null,"MemberCount":0},{"Type":"extension","LastActivity":"2019-02-09 15:45:20 UTC","ExtensionNumber":"200","MobileNumber":"+44123456789","ContactNumber1":null,"ContactNumber2":null,"uID":"8D68C1D08E4B5B7","cID":null,"gID":null,"DisplayName":"康拉德德湿","Position":"Sales Manager","Description":null,"MemberCount":0},{"Type":"group","LastActivity":"2019-02-01 10:55:30 UTC","ExtensionNumber":"101","MobileNumber":null,"ContactNumber1":null,"ContactNumber2":null,"uID":null,"cID":null,"gID":"8D68C1D4AAB3621","DisplayName":"My Peeps Yo","Position":null,"Description":null,"MemberCount":4},{"Type":"contact","LastActivity":"2018-03-15 10:59:41 UTC","ExtensionNumber":null,"MobileNumber":null,"ContactNumber1":"+27831234567","ContactNumber2":"+44123456789","uID":null,"cID":"8D68C1D442A96B6","gID":null,"DisplayName":"Alberto Hensley","Position":null,"Description":"Master in Charge","MemberCount":0}],"DataObject":null,"IsCachedResult":false,"ChacheTimeout":0.0,"CacheKey":"D807137B7750F5D62B3DD57AC8D65AE6"}

    console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
    console.log("Total Rows: " + json.TotalRows);
    $.each(json.DataCollection, function (i, item) {
        if(item.Type == "extension"){
            // extension
            var buddy = new Buddy("extension", item.uID, item.DisplayName, item.ExtensionNumber, item.MobileNumber, "", "", item.LastActivity, item.Position);
            AddBuddy(buddy, false, false);
        }
        else if(item.Type == "contact"){
            // contact
            var buddy = new Buddy("contact", item.cID, item.DisplayName, "", "", item.ContactNumber1, item.ContactNumber2, item.LastActivity, item.Description);
            AddBuddy(buddy, false, false);
        }
        else if(item.Type == "group"){
            // group
            var buddy = new Buddy("group", item.gID, item.DisplayName, item.ExtensionNumber, "", "", "", item.LastActivity, item.MemberCount + " member(s)");
            AddBuddy(buddy, false, false);
        }
    });

    // Update List (after add)
    console.log("Updating Buddy List...");
    UpdateBuddyList();

    // conference, message-summary, dialog, presence, presence.winfo, xcap-diff, dialog.winfo, refer
    // dialog... var dialogOptions = { expires: 300, extraHeaders: ['Accept: application/dialog-info+xml'] };
    var dialogOptions = { expires: 300, extraHeaders: ['Accept: application/pidf+xml'] };

    console.log("Starting Subscribe of all ("+ Buddies.length +") Extension Buddies...");
    for(var b=0; b<Buddies.length; b++)
    {
        var buddyObj = Buddies[b];
        if(buddyObj.type == "extension")
        {
            console.log("SUBSCRIBE: "+ buddyObj.ExtNo +"@" + wssServer);
            var blfObj = userAgent.subscribe(buddyObj.ExtNo +"@" + wssServer, 'presence', dialogOptions); 
            blfObj.on('notify', function (notification) {
                RecieveBlf(notification);
            });
            BlfSubs.push(blfObj);
        }
    }
}
function RecieveBlf(notification) {
    if (userAgent == null || !userAgent.isRegistered()) return;

    var ContentType = notification.request.headers["Content-Type"][0].parsed;
            
    if (ContentType == "application/pidf+xml") {
        // Handle "Precence"

        var xml = $($.parseXML(notification.request.body));

        /*
        <?xml version="1.0" encoding="ISO-8859-1"?>
        <presence
            xmlns="urn:ietf:params:xml:ns:pidf" 
            xmlns:pp="urn:ietf:params:xml:ns:pidf:person" 
            xmlns:es="urn:ietf:params:xml:ns:pidf:rpid:status:rpid-status"
            xmlns:ep="urn:ietf:params:xml:ns:pidf:rpid:rpid-person"
            entity="sip:webrtc@192.168.88.98">

            <pp:person>
                <status>
                    <ep:activities>
                        <ep:away/>
                    </ep:activities>
                </status>
            </pp:person>

            <note>Not online</note>
            <tuple id="300">
                <contact priority="1">sip:300@192.168.88.98</contact>
                <status>
                    <basic>open | closed</basic>
                </status>
            </tuple>
        </presence>
        */

        var Entity = xml.find("presence").attr("entity");
        var me = Entity.split("@")[0].split(":")[1];
        if ($("#authname").val() != me) return;

        var buddy = xml.find("presence").find("tuple").attr("id");

        var statusObj = xml.find("presence").find("tuple").find("status");
        var availability = xml.find("presence").find("tuple").find("status").find("basic").text();
        var friendlyState = xml.find("presence").find("note").text();
        var dotClass = "dotOffline";
        if (friendlyState == "Not online") dotClass = "dotOffline";
        if (friendlyState == "Ready") dotClass = "dotOnline";
        if (friendlyState == "On the phone") dotClass = "dotInUse";
        if (friendlyState == "Ringing") dotClass = "dotRinging";
        if (friendlyState == "On hold") dotClass = "dotOnHold";
        if (friendlyState == "Unavailable") dotClass = "dotOffline";

        // dotOnline | dotOffline | dotRinging | dotInUse | dotReady | dotOnHold
        var buddyObj = FindBuddyByExtNo(buddy);
        if(buddyObj != null)
        {
            console.log("Setting Presence for "+ buddyObj.identity +" to "+ friendlyState);
            $("#contact-" + buddyObj.identity + "-devstate").attr("class", dotClass);
            $("#contact-" + buddyObj.identity + "-devstate-main").attr("class", dotClass);
            $("#contact-" + buddyObj.identity + "-presence").html(friendlyState);
            $("#contact-" + buddyObj.identity + "-presence-main").html(friendlyState);

            buddyObj.devState = dotClass;
            buddyObj.presence = friendlyState;
        }
    }
    else if (ContentType == "application/dialog-info+xml")
    {
        // Handle "Dialog" State

        var xml = $($.parseXML(notification.request.body));

        /*
        <?xml version="1.0"?>
        <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info" version="0-99999" state="full|partial" entity="sip:xxxx@XXX.XX.XX.XX">
            <dialog id="xxxx">
                <state>trying | proceeding | early | terminated | confirmed</state>
            </dialog>
        </dialog-info>
        */

        var ObservedUser = xml.find("dialog-info").attr("entity");
        var buddy = ObservedUser.split("@")[0].split(":")[1];

        var version = xml.find("dialog-info").attr("version");

        var DialogState = xml.find("dialog-info").attr("state");
        if (DialogState != "full") return;

        var extId = xml.find("dialog-info").find("dialog").attr("id");
        if (extId != buddy) return;

        var state = xml.find("dialog-info").find("dialog").find("state").text();
        var friendlyState = "Unknown";
        if (state == "terminated") friendlyState = "Ready";
        if (state == "trying") friendlyState = "On the phone";
        if (state == "proceeding") friendlyState = "On the phone";
        if (state == "early") friendlyState = "Ringing";
        if (state == "confirmed") friendlyState = "On the phone";

        var dotClass = "dotOffline";
        if (friendlyState == "Not online") dotClass = "dotOffline";
        if (friendlyState == "Ready") dotClass = "dotOnline";
        if (friendlyState == "On the phone") dotClass = "dotInUse";
        if (friendlyState == "Ringing") dotClass = "dotRinging";
        if (friendlyState == "On hold") dotClass = "dotOnHold";
        if (friendlyState == "Unavailable") dotClass = "dotOffline";

        // The dialog states only report devices states, and cant say online or offline.
        // dotOnline | dotOffline | dotRinging | dotInUse | dotReady | dotOnHold
        var buddyObj = FindBuddyByExtNo(buddy);
        if(buddyObj != null)
        {
            console.log("Setting Presence for "+ buddyObj.identity +" to "+ friendlyState);
            $("#contact-" + buddyObj.identity + "-devstate").attr("class", dotClass);
            $("#contact-" + buddyObj.identity + "-devstate-main").attr("class", dotClass);
            $("#contact-" + buddyObj.identity + "-presence").html(friendlyState);
            $("#contact-" + buddyObj.identity + "-presence-main").html(friendlyState);

            buddyObj.devState = dotClass;
            buddyObj.presence = friendlyState;
        }
    }
}
function UnSubscribe() {
    console.log("Unsubscribing "+ BlfSubs.length + " subscriptions...");
    for (var blf = 0; blf < BlfSubs.length; blf++) {
        BlfSubs[blf].unsubscribe();
        BlfSubs[blf].close();
    }
    BlfSubs = new Array();

    for(var b=0; b<Buddies.length; b++)
    {
        var buddyObj = Buddies[b];
        if(buddyObj.type == "extension")
        {
            $("#contact-" + buddyObj.identity + "-devstate").attr("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-devstate-main").attr("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-presence").html("Unknown");
            $("#contact-" + buddyObj.identity + "-presence-main").html("Unknown");
        }
    }
}

// Buddy: Chat / Instant Message / XMPP
// ====================================
function SendChatMessage(buddy) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

    var message = $("#contact-" + buddy + "-ChatMessage").val();
    message = $.trim(message);
    if (message == "") return;

    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj.type == "extension" || buddyObj.type == "group") {
        var chatBuddy = buddyObj.ExtNo + "@" + wssServer;
        console.log("MESSAGE: "+ chatBuddy + " (extension)");
        userAgent.message(chatBuddy, message);
    } 

    var DateTime = new Date().toLocaleTimeString();
    var formattedMessage = ReformatMessage(message);
    var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"width: 80px\">"
        + "<div class=messageDate>" + DateTime + "</div>"
        + "</td><td>"
        + "<div class=ourChatMessageText>" + formattedMessage + "</div>"
        + "</td><td style=\"width: 30px\">"
        + "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url(/api/img/?action=GetUserPicture&u=" + profileUserID + ")\"></div>"
        + "</td></tr></table>";
    $("#contact-" + buddy + "-ChatHistory").append(messageString);
    updateScroll(buddy)

    $("#contact-" + buddy + "-ChatMessage").val("");

    ClearChatPreview(buddy);

    // Update Last Activity
    // ====================
    UpdateBuddyActivity(buddy);
}
function ReceiveMessage(message) {
    console.log("New Incoming Message!");

    var fromSipUri = "" + message.remoteIdentity.uri; //sip:200@192.168.88.98
    var buddy = fromSipUri.split("@")[0].split(":")[1];
    var fromName = message.remoteIdentity.displayName;
    var origionalMessage = message.body;
    var formattedMessage = ReformatMessage(message.body); // Check if its Json ??

    var buddyObj = FindBuddyByExtNo(buddy);
    if(buddyObj == null) return;                        // TODO: make contact because it not found

    // Get the actual Person sending (since all group messages come from the group)

    var DateTime = new Date().toLocaleTimeString();
    var imageUrl = "/api/img/?action=GetUserPicture&u=" + buddyObj.identity +"&MaxSize=76";
    var ActualSender = "";
    if(buddyObj.type == "group"){
        var assertedIdentity = message.request.headers["P-Asserted-Identity"][0].raw; // Name Surname <ExtNo> 
        // console.log(assertedIdentity);
        var bits = assertedIdentity.split(" <");
        var CallerID = bits[0];
        var CallerIDNum = bits[1].replace(">", "");

        imageUrl = "/api/img/?action=GetUserPicture&e=" + CallerIDNum +"&MaxSize=76";
        ActualSender = CallerID; // P-Asserted-Identity;
    }
    var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr><td style=\"width: 30px\">"
        + "<div class=\"buddyIconSmall\" style=\"background-image: url(" + imageUrl + ")\"></div>"
        + "</td><td>"
        + "<div class=theirChatMessageText>" + formattedMessage + "</div>"
        + "</td><td style=\"width: 80px\">"
        + "<div class=messageDate>" + DateTime + "</div>"
        if(buddyObj.type == "group"){
            messageString += "<div class=messageDate>" + ActualSender + "</div>"
        }
        messageString += "</td></tr></table>";
    $("#contact-" + buddyObj.identity + "-ChatHistory").append(messageString);

    updateScroll(buddyObj.identity);

    // Update Last Activity
    // ====================
    UpdateBuddyActivity(buddyObj.identity);

    // Handle Stream Not visible
    // =========================
    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
    if (!streamVisible) {
        // Add or Increase the Badge
        IncreaseMissedBadge(buddyObj.identity);
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                var noticeOptions = { body: origionalMessage.substring(0, 250), image: imageUrl }
                var inComingChatNotification = new Notification("Message from : " + buddy +" - " + buddyObj.CallerIDName, noticeOptions);
                inComingChatNotification.onclick = function (event) {
                    // Show Message
                    SelectBuddy(buddyObj.identity);
                }
            }
        }

    }
}
function AddCallMessage(buddy, message) {
    $("#contact-" + buddy + "-ChatHistory").append("<div class=\"theirChatMessage\">" + message + "</div>");
    UpdateBuddyActivity(buddy);
}
function SendImageDataMessage(buddy, ImgDataUrl) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

    // Ajax Upload
    // ===========

    var DateTime = new Date().toLocaleTimeString();
    var formattedMessage = '<IMG class=previewImage onClick="PreviewImage(this)" src="'+ ImgDataUrl +'">';
    var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"width: 80px\">"
        + "<div class=messageDate>" + DateTime + "</div>"
        + "</td><td>"
        + "<div class=ourChatMessageText>" + formattedMessage + "</div>"
        + "</td><td style=\"width: 30px\">"
        + "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url(/api/img/?action=GetUserPicture&u=" + profileUserID + ")\"></div>"
        + "</td></tr></table>";
    $("#contact-" + buddy + "-ChatHistory").append(messageString);
    updateScroll(buddy);

    ImageEditor_Cancel(buddy);

    UpdateBuddyActivity(buddy);
}
function SendFileDataMessage(buddy, FileDataUrl, fileName, fileSize) {
    // if (userAgent == null) return;
    // if (!userAgent.isRegistered()) return;

    var fileID = uniqueId();

    // Ajax Upload
    // ===========
    $.ajax({
        type:'POST',
        url: '/api/',
        data: "<XML>"+ FileDataUrl +"</XML>",
        xhr: function(e) {
            var myXhr = $.ajaxSettings.xhr();
            if(myXhr.upload){
                myXhr.upload.addEventListener('progress',function(event){
                    var percent = (event.loaded / event.total) * 100;
                    console.log("Progress for upload to "+ buddy +" ("+ fileID +"):"+ percent);
                    $("#FileProgress-Bar-"+ fileID).css("width", percent +"%");
                }, false);
            }
            return myXhr;
        },
        success:function(data, status, jqXHR){
            // console.log(data);
            $("#FileUpload-"+ fileID).html("Sent");
            $("#FileProgress-"+ fileID).hide();
            $("#FileProgress-Bar-"+ fileID).css("width", "0%");
        },
        error: function(data, status, error){
            // console.log(data);
            $("#FileUpload-"+ fileID).html("Failed ("+ data.status +")");
            $("#FileProgress-"+ fileID).hide();
            $("#FileProgress-Bar-"+ fileID).css("width", "100%");
        }
    });

    // Add To Message Stream
    // =====================
    var DateTime = new Date().toLocaleTimeString();

    var showReview = false;
    var fileIcon = '<i class="fa fa-file"></i>';
    // Image Icons
    if(fileName.toLowerCase().endsWith(".png")) {
        fileIcon =  '<i class="fa fa-file-image-o"></i>';
        showReview = true;
    }
    if(fileName.toLowerCase().endsWith(".jpg")) {
        fileIcon =  '<i class="fa fa-file-image-o"></i>';
        showReview = true;
    }
    if(fileName.toLowerCase().endsWith(".jpeg")) {
        fileIcon =  '<i class="fa fa-file-image-o"></i>';
        showReview = true;
    }
    if(fileName.toLowerCase().endsWith(".bmp")) {
        fileIcon =  '<i class="fa fa-file-image-o"></i>';
        showReview = true;
    }
    if(fileName.toLowerCase().endsWith(".gif")) {
        fileIcon =  '<i class="fa fa-file-image-o"></i>';
        showReview = true;
    }
    // video Icons
    if(fileName.toLowerCase().endsWith(".mov")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    if(fileName.toLowerCase().endsWith(".avi")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    if(fileName.toLowerCase().endsWith(".mpeg")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    if(fileName.toLowerCase().endsWith(".mp4")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    if(fileName.toLowerCase().endsWith(".mvk")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    if(fileName.toLowerCase().endsWith(".webm")) fileIcon =  '<i class="fa fa-file-video-o"></i>';
    // Audio Icons
    if(fileName.toLowerCase().endsWith(".wav")) fileIcon =  '<i class="fa fa-file-audio-o"></i>';
    if(fileName.toLowerCase().endsWith(".mp3")) fileIcon =  '<i class="fa fa-file-audio-o"></i>';
    if(fileName.toLowerCase().endsWith(".ogg")) fileIcon =  '<i class="fa fa-file-audio-o"></i>';
    // Compressed Icons
    if(fileName.toLowerCase().endsWith(".zip")) fileIcon =  '<i class="fa fa-file-archive-o"></i>';
    if(fileName.toLowerCase().endsWith(".rar")) fileIcon =  '<i class="fa fa-file-archive-o"></i>';
    if(fileName.toLowerCase().endsWith(".tar.gz")) fileIcon =  '<i class="fa fa-file-archive-o"></i>';
    // Pdf Icons
    if(fileName.toLowerCase().endsWith(".pdf")) fileIcon =  '<i class="fa fa-file-pdf-o"></i>';


    var formattedMessage = "<DIV><SPAN id=\"FileUpload-"+ fileID +"\">Sending</SPAN>: "+ fileIcon +" "+ fileName +"</DIV>"
    formattedMessage += "<DIV id=\"FileProgress-"+ fileID +"\" class=\"progressBarContainer\"><DIV id=\"FileProgress-Bar-"+ fileID +"\" class=\"progressBarTrack\"></DIV></DIV>"
    if(showReview){
        formattedMessage += "<DIV><IMG class=previewImage onClick=\"PreviewImage(this)\" src=\""+ FileDataUrl +"\"></DIV>";
    }

    var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"width: 80px\">"
        + "<div class=messageDate>" + DateTime + "</div>"
        + "</td><td>"
        + "<div class=ourChatMessageText>" + formattedMessage + "</div>"
        + "</td><td style=\"width: 30px\">"
        + "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url(/api/img/?action=GetUserPicture&u=" + profileUserID + ")\"></div>"
        + "</td></tr></table>";
    $("#contact-" + buddy + "-ChatHistory").append(messageString);
    updateScroll(buddy);

    ImageEditor_Cancel(buddy);

    // Update Last Activity
    // ====================
    UpdateBuddyActivity(buddy);
}
function updateScroll(buddy) {
    var element = $("#contact-"+ buddy +"-ChatHistory").get(0);
    element.scrollTop = element.scrollHeight;
}
function PreviewImage(obj){
    OpenWindow(obj.src, "Preview Image", 600, 800, false, false); //no close, no resize
}

var uniqueId = function() {
    return "id-" + Math.random().toString(36).substr(2, 16);
};

// Missed Item Notification
// ========================
function IncreaseMissedBadge(buddy) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    // Up the Missed Count
    // ===================
    buddyObj.missed += 1;

    // Update Badge
    // ============
    $("#contact-" + buddy + "-missed").text(buddyObj.missed);
    $("#contact-" + buddy + "-missed").show();
    console.log("Set Missed badge for "+ buddy +" to: "+ buddyObj.missed);
}
function UpdateBuddyActivity(buddy){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    // Update Last Activity Time
    // =========================
    buddyObj.lastActivity = moment().utc().format("YYYY-MM-DD HH:mm:ss") +" UTC";
    console.log("Last Activity is now: "+ buddyObj.lastActivity);

    // Sort and shuffle Buddy List
    // ===========================
    Buddies.sort(function(a, b){
        var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
        var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
        if (aMo.isSameOrAfter(bMo, "second")) {
            // console.log(aMo.format("YYYY-MM-DD HH:mm:ss") + " isSameOrAfter "+ bMo.format("YYYY-MM-DD HH:mm:ss"));
            return -1;
        } else return 1;
        return 0;
    });

    // List Update
    // ===========
    UpdateBuddyList();
}
function ClearMissedBadge(buddy) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    buddyObj.missed = 0;

    $("#contact-" + buddy + "-missed").text(buddyObj.missed);
    $("#contact-" + buddy + "-missed").hide(400);
}

// Buddy: Outbound Call
// ====================
function VideoCall(buddy) {

    var buddyObj = FindBuddyByIdentity(buddy);

    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: { exact: $("#audioSrc").val() }
                },
                video: {
                    width: { exact: 640 }, height: { exact: 360 }, aspectRatio: 1.77, deviceId: $("#videoSrc").val()
                }
            }
        }
    }
    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        var currentDevice = $("#videoSrc").val();

        var hasVideoDevice = false;
        var confirmedVideoDevice = false;

        var hasAudioDevice = false;

        for (var i = 0; i < deviceInfos.length; ++i) {

            var deviceInfo = deviceInfos[i];
            var devideId = deviceInfo.deviceId;

            if (deviceInfo.kind === "audioinput") {

            }
            else if (deviceInfo.kind === "audiooutput") {

            }
            else if (deviceInfo.kind === "videoinput") {
                hasVideoDevice = true;
                if(currentDevice != "default")
                {
                    if(currentDevice == devideId)
                    {
                        console.log("Confirmed video device:"+ devideId);
                        confirmedVideoDevice = true;
                    }
                }
            }
        }
        if(currentDevice != "default" && !confirmedVideoDevice) {
            console.warn("The device you used before is no longer availabe, default settings applied.");
            $("#videoSrc").val("default");
        }

        $("#contact-" + buddyObj.identity + "-msg").html("Starting Video Call...");

        if(hasVideoDevice)
        {
            console.log("INVITE (video): " + buddyObj.ExtNo + "@" + wssServer);
            console.log("Using Video/WebCam : " + $("#videoSrc").val());
            console.log("Using Microphone : " + $("#audioSrc").val());
            console.log("Using Speaker : " + $("#audioOutput").val());

            // Invite
            // ======
            var session = userAgent.invite("sip:" + buddyObj.ExtNo + "@" + wssServer, spdOptions);

            session.data.VideoSourceDevice = $("#videoSrc").val();
            //session.data.AudioSourceDevice = $("#videoSrc").val();
            //session.data.AudioOutputDevice = $("#videoSrc").val();


            // Add Call to CallSessions
            // ========================
            addActiveSession(session, true);

            // Do Nessesary UI Wireup
            // ======================
            wireupVideoSession(session, buddyObj.type, buddyObj.identity);

            // List Update
            // ===========
            UpdateBuddyActivity(buddyObj.identity);
        }
        else
        {
            Alert("Sorry, you don't have any WebCam/Video Source connected to this computer. You cannot use the video option.");
        }

    }).catch(function(e){
        console.error(e);
    })
}
function AudioCallMenu(buddy, obj){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    if(dhtmlxPopup != null)
    {
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;
    }
    dhtmlxPopup = new dhtmlXPopup();

    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj.type == "extension") {
        if(buddyObj.MobileNo != null && buddyObj.MobileNo != "")
        {
            dhtmlxPopup.attachList("name,number", [
						        {id: 1, name: "<i class=\"fa fa-phone-square\"></i> Call Extension", number: buddyObj.ExtNo},
						        {id: 2, name: "<i class=\"fa fa-mobile\"></i> Call Mobile", number: buddyObj.MobileNo}
            ]);
        } else {
            dhtmlxPopup.attachList("name,number", [
						        {id: 1, name: "<i class=\"fa fa-phone-square\"></i> Call Extension", number: buddyObj.ExtNo}
            ]);
        }
        dhtmlxPopup.attachEvent("onClick", function(id){
            var NumberToDial = dhtmlxPopup.getItemData(id).number;
            console.log("Menu click AudioCall("+ buddy +", "+ NumberToDial +")");
            dhtmlxPopup.hide();
            AudioCall(buddy, NumberToDial);
        });
    } else if(buddyObj.type == "contact") {
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != ""){
            dhtmlxPopup.attachList("number", [
						        {id: 1, number: buddyObj.ContactNumber1},
						        {id: 2, number: buddyObj.ContactNumber2}
            ]);
        }
        else {
            dhtmlxPopup.attachList("number", [
						        {id: 1, number: buddyObj.ContactNumber1}
            ]);
        }
        dhtmlxPopup.attachEvent("onClick", function(id){
            var NumberToDial = dhtmlxPopup.getItemData(id).number;
            console.log("Menu click AudioCall("+ buddy +", "+ NumberToDial +")");
            dhtmlxPopup.hide();
            AudioCall(buddy, NumberToDial);
        });
    } else if(buddyObj.type == "group") {
        dhtmlxPopup.attachList("name,number", [
						    {id: 1, name: "<i class=\"fa fa-users\"></i> Call Group", number: buddyObj.ExtNo }
        ]);
        dhtmlxPopup.attachEvent("onClick", function(id){
            console.log("Menu click AudioCallGroup("+ buddy +")");
            dhtmlxPopup.hide();
            AudioCall(buddy, dhtmlxPopup.getItemData(id).number);
        });
    }
    dhtmlxPopup.show(x, y, w, h);
}
function AudioCall(buddy, dialledNumber) {

    var buddyObj = FindBuddyByIdentity(buddy);

    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: {exact: $("#audioSrc").val()}
                    // optional: [{ sourceId: $("#audioSrc").val() }]
                },
                video: false
            }
        }
    }

    $("#contact-" + buddyObj.identity + "-msg").html("Starting Audio Call...");

    // Invite
    console.log("INVITE (audio): " + dialledNumber + "@" + wssServer);
    var session = userAgent.invite("sip:" + dialledNumber + "@" + wssServer, spdOptions);

    // Add Call to CallSessions
    // ========================
    addActiveSession(session, true);

    wireupAudioSession(session, buddyObj.type, buddyObj.identity);

    // List Update
    // ===========
    UpdateBuddyActivity(buddy);
}

// Sessions & During Call Activity
// ===============================
function addActiveSession(session, setActive)
{
    console.log("Adding Session...");

    // Put all the other calls on hold
    for(var c=0; c<CallSessions.length; c++)
    {
        CallSessions[c].hold();
        if(setActive) CallSessions[c].data.IsCurrentCall = false;
    }

    if(setActive) session.data.IsCurrentCall = true;
    CallSessions.push(session);
    
    console.log("CallSessions("+  CallSessions.length +") to follow:");
    console.log(CallSessions);
}
function removeSession(session)
{
    console.log("Removing Session...");

    // Delete from CallSessions
    for(var c=0; c<CallSessions.length; c++)
    {
        if(CallSessions[c].id == session.id)
        {
            // Add to PreviousSessions
            session.data.IsCurrentCall = false;
            PreviousSessions.push(session);

            CallSessions[c].data.IsCurrentCall = false;
            CallSessions.splice(c, 1);

            break;
        }
    }

    console.log("CallSessions("+  CallSessions.length +") to follow:");
    console.log(CallSessions);
    console.log("PreviousSessions("+  PreviousSessions.length +") to follow:");
    console.log(PreviousSessions);
}
function switchSessions(buddy)
{
    console.log("Switching Sessions...");
    var newSession = getSession(buddy);

    for(var c=0; c<CallSessions.length; c++)
    {
        if(CallSessions[c].data.IsCurrentCall)
        {
            console.log("Putting an active call on hold");

            CallSessions[c].hold();
            CallSessions[c].data.IsCurrentCall = false;
        }
    }

    if(newSession != null)
    {
        console.log("Taking call off hold: "+ buddy);

        newSession.unhold();
        newSession.data.IsCurrentCall = true;
    }
    // console.log("CallSessions("+  CallSessions.length +") to follow:");
    // console.log(CallSessions);
}
function getActiveSession(){
    for(var c=0; c<CallSessions.length; c++)
    {
        if(CallSessions[c].data.IsCurrentCall) return CallSessions[c];
    }
    return null; // No active calls
}
function getSession(buddy) {
    var id = $("#contact-" + buddy + "-sipCallId").val();
    for (s = 0; s < CallSessions.length; s++) {
        if (CallSessions[s] != null) {
            if (CallSessions[s].id == id) return CallSessions[s];
        }
    }
    return null;
}

function cancelSession(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        console.log("Cancelling session : "+ buddy);

        session.cancel();
        $("#contact-" + buddy + "-msg").html("Call Cancelled");
    } else {
        $("#contact-" + buddy + "-msg").html("Cancel failed, null session");
    }
}
function transferSession(buddy) {
    // Not Yet implemented 
}
function holdSession(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        console.log("Putting Call on hold: "+ buddy);
        session.hold();

        $("#contact-" + buddy + "-btn-Hold").hide();
        $("#contact-" + buddy + "-btn-Unhold").show();
        $("#contact-" + buddy + "-msg").html("Call on Hold");
    } else {
        $("#contact-" + buddy + "-msg").html("Hold failed, null session");
    }
}
function unholdSession(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        console.log("Taking call off hold: "+ buddy);
        session.unhold();

        $("#contact-" + buddy + "-msg").html("Call Active");
        $("#contact-" + buddy + "-btn-Hold").show();
        $("#contact-" + buddy + "-btn-Unhold").hide();
    } else {
        $("#contact-" + buddy + "-msg").html("Unhold Failed, null session");
    }
}
function endSession(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        console.log("Ending call with: "+ buddy);
        session.bye();

        $("#contact-" + buddy + "-msg").html("Bye...");
    }
    $("#contact-" + buddy + "-ActiveCall").hide();
}
function sendDTMF(buddy, itemStr) {
    var session = getSession(buddy);
    if (session != null) {
        console.log("Sending DTMF ("+itemStr +"): "+ buddy);
        session.dtmf(itemStr);

        $("#contact-" + buddy + "-msg").html("Sent DTMF: "+ itemStr);
    } else {
        $("#contact-" + buddy + "-msg").html("DTMF Failed, null session");
    }
}
function switchVideoSource(buddy, srcId)
{
    var session = getSession(buddy);
    if (session != null) {
        $("#contact-" + buddy + "-msg").html("Switching video source");

        // If you are switching back from Scratchpad
        $("#contact-" + buddy + "-scratchpad-container").hide();
        $("#contact-" + buddy + "-sharevideo-contaner").hide();

        var constraints = { 
            audio: false,
            video: {
                width: { exact: 640 }, height: { exact: 360 }, aspectRatio: 1.77, deviceId: srcId
            }
        }

        session.data.VideoSourceDevice = srcId;

        var localStream = new MediaStream();
        navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
            var newMediaTrack = newStream.getVideoTracks()[0];
            var pc = session.sessionDescriptionHandler.peerConnection;
            pc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track.kind == "video") {
                    console.log("Switching Video Track : "+ RTCRtpSender.track.label + " to "+ newMediaTrack.label);
                    RTCRtpSender.track.stop();
                    RTCRtpSender.replaceTrack(newMediaTrack);
                    localStream.addTrack(newMediaTrack);
                }
            });
        }).catch(function(){
            console.error("Error on getUserMedia");
        });

        // Set Preview
        // ===========
        console.log("Showing as preview...");
        var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
        localVideo.srcObject = localStream;
        localVideo.play();
    } 
    else {
        console.log("Session is Null, probably not in a call yet");
    }
}
function SendCanvas(buddy){
    var session = getSession(buddy);
    if (session != null) {
        $("#contact-" + buddy + "-msg").html("Switching to canvas");

        $("#contact-" + buddy + "-scratchpad-container").hide();
        $("#contact-" + buddy + "-sharevideo-contaner").hide();

        // Create scratch Pad
        var scratchpad = GetCanvas("contact-" + buddy + "-scratchpad");
        if(scratchpad != null)
        {
            window.clearInterval(scratchpad.redrawIntrtval);

            RemoveCanvas("contact-" + buddy + "-scratchpad");
            $("#contact-" + buddy + "-scratchpad-container").empty();

            scratchpad = null;
        }

        var newCanvas = $('<canvas/>');
        newCanvas.attr("id", "contact-" + buddy + "-scratchpad");
        newCanvas.css("border", "1px solid #CCCCCC");
        $("#contact-" + buddy + "-scratchpad-container").append(newCanvas);
        $("#contact-" + buddy + "-scratchpad-container").show();

        console.log("Canvas for Scratchpad created...");
        $("#contact-" + buddy + "-scratchpad").attr("width", 640); // SD
        $("#contact-" + buddy + "-scratchpad").attr("height", 360); // SD


        scratchpad = new fabric.Canvas("contact-" + buddy + "-scratchpad");
        scratchpad.id = "contact-" + buddy + "-scratchpad";
        scratchpad.backgroundColor = "#FFFFFF";
        scratchpad.isDrawingMode = true;
        scratchpad.renderAll();
        scratchpad.redrawIntrtval = window.setInterval(function(){
            scratchpad.renderAll();
        }, 1000);

        CanvasCollection.push(scratchpad);

        session.data.VideoSourceDevice = "scratchpad";

        // Get The Canvas Stream
        // =====================
        var canvasMediaStream = $("#contact-"+ buddy +"-scratchpad").get(0).captureStream();
        var canvasMediaTrack = canvasMediaStream.getVideoTracks()[0];

        // Switch Tracks
        // =============
        var pc = session.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track.kind == "video") {
                console.log("Switching Track : "+ RTCRtpSender.track.label + " to Scratchpad Canvas");
                RTCRtpSender.track.stop();
                RTCRtpSender.replaceTrack(canvasMediaTrack);
            }
        });

        // Set Preview
        // ===========
        console.log("Showing as preview...");
        var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
        localVideo.srcObject = canvasMediaStream;
        localVideo.play();
    } else {
        console.log("Session is Null, probably not in a call yet.");
    }
}
function SendVideo(buddy, src){
    var session = getSession(buddy);
    if (session != null) {
        $("#contact-" + buddy + "-msg").html("Switching to Shared Video");

        $("#contact-" + buddy + "-scratchpad-container").hide();
        $("#contact-" + buddy + "-sharevideo-contaner").hide();

        // Has to source from a know location that has CORS enabled
        src = "{{%global.CloudFrontUrl%}}/assets/img/chrome.webm";

        $("#contact-" + buddy + "-sharevideo-contaner").empty();

        session.data.VideoSourceDevice = "video";

        // Create Video Object
        // ===================
        var newVideo = $('<video/>');
        newVideo.attr("id", "contact-" + buddy + "-sharevideo");
        newVideo.attr("controls",true);
        newVideo.attr("crossorigin", "anonymous");
        newVideo.attr("src", src);
        newVideo.css("max-width", "640px");
        newVideo.css("max-height", "360x");
        // newVideo.attr("muted",true);
        newVideo.on("canplay", function () {
            console.log("Video can play now... ");

            var videoMediaStream = $("#contact-"+ buddy +"-sharevideo").get(0).captureStream();
            var videoMediaTrack = videoMediaStream.getVideoTracks()[0];

            // Switch Tracks
            // =============
            var pc = session.sessionDescriptionHandler.peerConnection;
            pc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track.kind == "video") {
                    console.log("Switching Track : "+ RTCRtpSender.track.label);
                    RTCRtpSender.track.stop();
                    RTCRtpSender.replaceTrack(videoMediaTrack);
                }
            });

            // Set Preview
            // ===========
            console.log("Showing as preview...");
            var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
            localVideo.srcObject = videoMediaStream;
            localVideo.play();

            // Play the video
            // ==============
            console.log("Starting Video...");
            $("#contact-"+ buddy +"-sharevideo").get(0).play();
        });

        $("#contact-" + buddy + "-sharevideo-contaner").append(newVideo);

        $("#contact-" + buddy + "-sharevideo-contaner").show();

        console.log("Video for Sharing created...");
    } else {
        console.log("Session is Null, probably not in a call yet");
    }
}
function ShareScreen(buddy){
    var session = getSession(buddy);
    if (session != null) {
        $("#contact-" + buddy + "-msg").html("Switching to Shared Screen");

        $("#contact-" + buddy + "-scratchpad-container").hide();
        $("#contact-" + buddy + "-sharevideo-contaner").hide();

        session.data.VideoSourceDevice = "screen";

        var localStream = new MediaStream();
        var pc = session.sessionDescriptionHandler.peerConnection;

        // TODO: Remove legasy ones
        if (navigator.getDisplayMedia) {
            // EDGE, legasy support
            var screenShareConstraints = { video: true, audio: false }
            navigator.getDisplayMedia(screenShareConstraints).then(function(newStream) {
                console.log("navigator.getDisplayMedia")
                var newMediaTrack = newStream.getVideoTracks()[0];
                pc.getSenders().forEach(function (RTCRtpSender) {
                    if(RTCRtpSender.track.kind == "video") {
                        console.log("Switching Video Track : "+ RTCRtpSender.track.label + " to Screen");
                        RTCRtpSender.track.stop();
                        RTCRtpSender.replaceTrack(newMediaTrack);
                        localStream.addTrack(newMediaTrack);
                    }
                });

                // Set Preview
                // ===========
                console.log("Showing as preview...");
                var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
                localVideo.srcObject = localStream;
                localVideo.play();
            }).catch(function (err) {
                console.error("Error on getUserMedia");
            });
        } 
        else if (navigator.mediaDevices.getDisplayMedia) {
            // New standard
            var screenShareConstraints = { video: true, audio: false }
            navigator.mediaDevices.getDisplayMedia(screenShareConstraints).then(function(newStream) {
                console.log("navigator.mediaDevices.getDisplayMedia")
                var newMediaTrack = newStream.getVideoTracks()[0];
                pc.getSenders().forEach(function (RTCRtpSender) {
                    if(RTCRtpSender.track.kind == "video") {
                        console.log("Switching Video Track : "+ RTCRtpSender.track.label + " to Screen");
                        RTCRtpSender.track.stop();
                        RTCRtpSender.replaceTrack(newMediaTrack);
                        localStream.addTrack(newMediaTrack);
                    }
                });

                // Set Preview
                // ===========
                console.log("Showing as preview...");
                var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
                localVideo.srcObject = localStream;
                localVideo.play();
            }).catch(function (err) {
                console.error("Error on getUserMedia");
            });
        } 
        else {
            // Firefox, apparently
            var screenShareConstraints = { video: {mediaSource: 'screen'}, audio: false }
            navigator.mediaDevices.getUserMedia(screenShareConstraints).then(function(newStream) {
                console.log("navigator.mediaDevices.getUserMedia")
                var newMediaTrack = newStream.getVideoTracks()[0];
                pc.getSenders().forEach(function (RTCRtpSender) {
                    if(RTCRtpSender.track.kind == "video") {
                        console.log("Switching Video Track : "+ RTCRtpSender.track.label + " to Screen");
                        RTCRtpSender.track.stop();
                        RTCRtpSender.replaceTrack(newMediaTrack);
                        localStream.addTrack(newMediaTrack);
                    }
                });

                // Set Preview
                // ===========
                console.log("Showing as preview...");
                var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
                localVideo.srcObject = localStream;
                localVideo.play();
            }).catch(function (err) {
                console.error("Error on getUserMedia");
            });
        }

    } else {
        console.log("Session is Null, probably not in a call yet");
    }
}

// Buddy & Contacts
// ================
var Buddy = function(type, identity, CallerIDName, ExtNo, MobileNo, ContactNumber1, ContactNumber2, lastActivity, desc){
    this.type = type; // extension | contact | group
    this.identity = identity;
    this.CallerIDName = CallerIDName;
    this.description = desc;
    this.ExtNo = ExtNo;
    this.MobileNo = MobileNo;
    this.ContactNumber1 = ContactNumber1;
    this.ContactNumber2 = ContactNumber2;
    this.lastActivity = lastActivity; // Full Date as string eg "1208-03-21 15:34:23 UTC"
    this.devState = "dotOffline";
    this.presence = "Unknown";
    this.missed = 0;
    this.IsSelected = false;
}

function AddBuddy(buddyObj, update, focus){

    Buddies.push(buddyObj);
    if(update) UpdateBuddyList();

    AddBuddyMessageStream(buddyObj);

    if(focus) SelectBuddy(buddyObj.identity);
}
function UpdateBuddyList(filter){
    $("#myContacts").empty();

    for(var b = 0; b < Buddies.length; b++)
    {
        var buddyObj = Buddies[b];

        if(filter && filter.length >= 1){
            // Perform Filter Display
            var display = false;
            if(buddyObj.CallerIDName.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.ExtNo.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.description.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(!display) continue;
        }

        var today = moment.utc();
        var lastActivity = moment.utc(buddyObj.lastActivity.replace(" UTC", ""));
        var displayDateTime = "";
        if(lastActivity.isSame(today, 'day'))
        {
            displayDateTime = lastActivity.local().format("HH:mm:ss"); // TODO, enter UTC offset here
        } 
        else {
            displayDateTime = lastActivity.local().format("YYYY-MM-DD");
        }

        console.log("Adding: "+ buddyObj.identity + " of type "+ buddyObj.type);
        if(buddyObj.type == "extension") { // An extension on the same system
            // Left
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class=buddy onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'extension')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-devstate\" class=\""+ buddyObj.devState +"\"></span>";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">"+ buddyObj.missed +"</span>";
            html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetUserPicture&u="+ buddyObj.identity +"&MaxSize=76)\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-phone-square\"></i> "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-presence\" class=presenceText>"+ buddyObj.presence +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "contact") { // An Addressbook Contact
            // Left
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class=buddy onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'contact')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">0</span>";
            html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetContactPicture&c="+ buddyObj.identity +"&MaxSize=76)\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-address-card\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.description +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "group"){ // A collection of extensions and contacts
            // Left
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class=buddy onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'group')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">0</span>";
            html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetGroupPicture&g="+ buddyObj.identity +"&MaxSize=76)\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-users\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.description +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        }
    }

    // Make Select
    // ===========
    for(var b = 0; b < Buddies.length; b++)
    {
        if(Buddies[b].IsSelected) {
            SelectBuddy(Buddies[b].identity, Buddies[b].type);
            break;
        }
    }
}
function AddBuddyMessageStream(buddyObj) {
    var html = "<table id=\"stream-"+ buddyObj.identity +"\" class=stream cellspacing=5 cellpadding=0>";
    html += "<tr><td class=streamSection style=\"height: 48px;\">";

    // Close|Return|Back Button
    // ========================
    html += "<div style=\"float:left; margin:0px; padding:5px; height:38px; line-height:38px\">"
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-back\" onclick=\"CloseBuddy('"+ buddyObj.identity +"')\" class=roundButtons title=\"Back\"><i class=\"fa fa-chevron-left\"></i></button> ";
    html += "</div>"
    
    // Profile UI
    // ==========
    html += "<div class=contact style=\"float: left;\" onclick=\"ShowBuddyProfileMenu('"+ buddyObj.identity +"', this, '"+ buddyObj.type +"')\">";
    if(buddyObj.type == "extension") {
        html += "<span id=\"contact-"+ buddyObj.identity +"-devstate-main\" class=\""+ buddyObj.devState +"\"></span>";
    }

    if(buddyObj.type == "extension") {
        html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetUserPicture&u="+ buddyObj.identity +"&MaxSize=76)\"></div>";
    }
    else if(buddyObj.type == "contact") {
        html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetContactPicture&c="+ buddyObj.identity +"&MaxSize=76)\"></div>";
    }
    else if(buddyObj.type == "group")
    {
        html += "<div class=buddyIcon style=\"background-image: url(/api/img/?action=GetGroupPicture&g="+ buddyObj.identity +"&MaxSize=76)\"></div>";
    }

    if(buddyObj.type == "extension") {
        html += "<div class=contactNameText><i class=\"fa fa-phone-square\"></i> "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +"</div>";
    }
    else if(buddyObj.type == "contact") {
        html += "<div class=contactNameText><i class=\"fa fa-address-card\"></i> "+ buddyObj.CallerIDName +"</div>";
    } else if(buddyObj.type == "group") {
        html += "<div class=contactNameText><i class=\"fa fa-users\"></i> "+ buddyObj.CallerIDName +"</div>";
    }

    if(buddyObj.type == "extension") {
        html += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText>"+ buddyObj.presence +"</div>";
    } else{
        html += "<div class=presenceText>"+ buddyObj.description +"</div>";
    }
    html += "</div>";

    // Action Buttons
    // ==============
    html += "<div style=\"float:right; line-height: 46px;\">";

    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-microphone\"></i></span> ";
    html += "<span class=meterContainer title=\"Microphone Levels\">";
    html += "<span id=\"contact-"+ buddyObj.identity +"-Mic\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-volume-up\"></i></span> ";
    html += "<span class=meterContainer title=\"Speaker Levels\">";
    html += "<span id=\"contact-"+ buddyObj.identity +"-Speaker\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";

    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-settings\" onclick=\"ChangeSettings('"+ buddyObj.identity +"', this)\" class=roundButtons title=\"Adjust Device Settings\"><i class=\"fa fa-cogs\"></i></button> ";
    if(buddyObj.type == "extension" || buddyObj.type == "group") {
        html += "<button id=\"contact-"+ buddyObj.identity +"-btn-shareFiles\" onclick=\"ShareFiles('"+ buddyObj.identity +"')\" class=roundButtons title=\"Share Files\"><i class=\"fa fa-share-alt\"></i></button> ";
    }
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-audioCall\" onclick=\"AudioCallMenu('"+ buddyObj.identity +"', this)\" class=roundButtons title=\"Audio Call\"><i class=\"fa fa-phone\"></i></button> ";
    if(buddyObj.type == "extension") {
        html += "<button id=\"contact-"+ buddyObj.identity +"-btn-videoCall\" onclick=\"VideoCall('"+ buddyObj.identity +"')\" class=roundButtons title=\"Video Call\"><i class=\"fa fa-video-camera\"></i></button> ";
    }
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-search\" onclick=\"FindSomething('"+ buddyObj.identity +"')\" class=roundButtons title=\"Find Something\"><i class=\"fa fa-search\"></i></button> ";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-remove\" onclick=\"RemoveBuddy('"+ buddyObj.identity +"')\" class=roundButtons title=\"Remove\"><i class=\"fa fa-trash\"></i></button> ";
    html += "</div>";

    // Separator
    // ============================================================================
    html += "<div style=\"clear:both; height:0px\"></div>"

    // ScratchPad
    // ==========
    html += "<div id=\"contact-"+ buddyObj.identity +"-scratchpad-container\" style=\"display:none\"></div>";
    // Video Source
    // ============
    html += "<div id=\"contact-"+ buddyObj.identity +"-sharevideo-contaner\" style=\"display:none\"></div>";
    // Conference
    // ==========
    html += "<div id=\"contact-"+ buddyObj.identity +"-conference\" style=\"display:none\"></div>";

    // Calling UI
    // ============================================================================
    html += "<div id=\"contact-"+ buddyObj.identity +"-calling\">";

    // Gneral Messages
    html += "<div id=\"contact-"+ buddyObj.identity +"-msg\" class=callStatus style=\"display:none\">...</div>";
    html += "<input id=\"contact-"+ buddyObj.identity +"-sipCallId\" type=hidden>";

    // Call Answer UI
    html += "<div id=\"contact-"+ buddyObj.identity +"-AnswerCall\" class=answerCall style=\"display:none\">";
    html += "<div>Incoming Call from : </div>";
    html += "<div><span id=\"contact-"+ buddyObj.identity +"-incomingCallerID\"><b>"+ buddyObj.CallerIDNum +" - "+ buddyObj.CallerIDName +"</b></div>";
    html += "<div>";
    html += "<button onclick=\"AnswerAudioCall('"+ buddyObj.identity +"')\"><i class=\"fa fa-phone\"></i> Answer Call</button> ";
    if(buddyObj.type == "extension") {
        html += "<button onclick=\"AnswerVideoCall('"+ buddyObj.identity +"')\"><i class=\"fa fa-video-camera\"></i> Answer Call with Video</button> ";
    }
    html += "<button onclick=\"RejectCall('"+ buddyObj.identity +"')\" class=hangupButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> Reject Call</button> ";
    html += "</div>";
    html += "<audio id=\"contact-"+ buddyObj.identity +"-ringer\" autoplay style=\"display:none\"></audio>";
    html += "</div>";

    // Dialing Out Progress
    html += "<div id=\"contact-"+ buddyObj.identity +"-progress\" style=\"display:none; margin-top: 10px\">";
    html += "<div class=progressCall>";
    html += "<button onclick=\"cancelSession('"+ buddyObj.identity +"')\" class=hangupButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> Cancel</button>";
    html += "</div>";
    html += "</div>";

    // Active Call UI
    html += "<div id=\"contact-"+ buddyObj.identity +"-ActiveCall\" style=\"display:none; margin-top: 10px;\">";

    // Video Call
    if(buddyObj.type == "extension") {
        html += "<div id=\"contact-"+ buddyObj.identity +"-VideoCall\" class=videoCall style=\"display:none\">";
        html += "<video id=\"contact-"+ buddyObj.identity +"-remoteVideo\"controls poster=\"/api/img/?action=GetUserPicture&u="+ buddyObj.identity +"\" class=remoteVideo style=\"width:100%; height:360px\"></video>";
        html += "<video id=\"contact-"+ buddyObj.identity +"-localVideo\" muted=muted poster=\"/api/img/?action=GetUserPicture&u="+ profileUserID +"\" class=localVideo></video>";
        html += "</div>";
    }
    // Audio Call
    html += "<div id=\"contact-"+ buddyObj.identity +"-AudioCall\" style=\"display:none; margin-top: 10px\">";
    html += "<audio id=\"contact-"+ buddyObj.identity +"-remoteAudio\" autoplay controls style=\"width:100%\"></audio>";
    html += "</div>";

    // In Call Buttons
    html += "<div style=\"text-align:center\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '1')\">1</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '2')\">2</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '3')\">3</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '4')\">4</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '5')\">5</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '6')\">6</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '7')\">7</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '8')\">8</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '9')\">9</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '0')\">0</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '*')\">*</button>";
    html += "<button onclick=\"sendDTMF('"+ buddyObj.identity +"', '#')\">#</button>";
    html += "</div>";
    html += "<div style=\"margin-top:10px\">";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-Transfer\" onclick=\"StartTransferSession('"+ buddyObj.identity +"')\" ><i class=\"fa fa-reply\"></i> Transfer</button>";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-Hold\" onclick=\"holdSession('"+ buddyObj.identity +"')\" ><i class=\"fa fa-pause-circle\"></i> Hold</button><button id=\"contact-"+ buddyObj.identity +"-btn-Unhold\" onclick=\"unholdSession('"+ buddyObj.identity +"')\" style=\"display:none\"><i class=\"fa fa-play-circle\"></i> UnHold</button>";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-End\" onclick=\"endSession('"+ buddyObj.identity +"')\" class=hangupButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> End Call</button>";
    html += "</div>";

    html += "<fieldset class=audioGraphSection style=\"height: 8px\">";
    html += "<legend onclick=\"ToggleThisHeight(this.parentElement,8,400)\" style=\"cursor:pointer\"><i class=\"fa fa-caret-right\"></i> Network Statistics</legend>";
    html += "<div class=\"cleanScroller\" style=\"height: 392px; overflow:auto\">";
    html += "<div style=\"width:600px;\">";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioSendBitRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioSendPacketRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioReceiveBitRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioReceivePacketRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioReceivePacketLoss\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioReceiveJitter\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"contact-"+ buddyObj.identity +"-AudioReceiveLevels\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "</div>";
    html += "</div>";
    html += "</fieldset>";

    html += "</div>";
    html += "</div>";
    html += "</div>";

    // Search & Related Elements
    html += "<div id=\"contact-"+ buddyObj.identity +"-search\" style=\"margin-top:10px; margin-bottom:10px; display:none\">";
    html += "<span class=searchClean><input type=text style=\"width:90%\" placeholder=\"Find something in the message stream...\">";
    html += "<button class=clearsearchTextBtn style=\"display:none\"></BUTTON></span>";
    html += "</div>";

    // File Share & Relates Elements
    html += "<div id=\"contact-"+ buddyObj.identity +"-fileShare\" style=\"display:none\">";
    html += "<input type=file multiple onchange=\"console.log(this)\" />";
    html += "</div>";

    html += "</td></tr>";
    // Message Stream
    html += "<tr><td class=streamSection>";

    html += "<div id=\"contact-"+ buddyObj.identity +"-ChatHistory\" class=\"chatHistory cleanScroller\" ondragenter=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragover=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragleave=\"cancelDragDrop(event, '"+ buddyObj.identity +"')\" ondrop=\"onFileDragDrop(event, '"+ buddyObj.identity +"')\">";
    // Previous Chat messages
    html += "</div>";

    html += "</td></tr>";
    if(buddyObj.type == "extension" || buddyObj.type == "group") {
        // Text Send
        html += "<tr><td  class=streamSection style=\"height:80px\">";

        html += "<div id=\"contact-"+ buddyObj.identity +"-imagePastePreview\" class=sendImagePreview style=\"display:none\" tabindex=0></div>";

        html += "<div id=\"contact-"+ buddyObj.identity +"-msgPreview\" class=sendMessagePreview style=\"display:none\">";
        html += "<button onclick=\"SendChatMessage('"+ buddyObj.identity +"')\" class=\"roundButtons sendMessagePreviewSend\" title=\"Send\"><i class=\"fa fa-paper-plane\"></i></button>";
        html += "<div class=sendMessagePreviewLeft>";
        html += "<span id=\"contact-"+ buddyObj.identity +"-msgPreviewhtml\" class=sendMessagePreviewHtml></span>";
        html += "</div>";
        html += "</div>";

        html += "<div class=sendMessageContainer>";
        html += "<button onclick=\"AddEmojy('"+ buddyObj.identity +"')\" class=\"roundButtons addEmoji\" title=\"Add Emoji\"><i class=\"fa fa-smile-o\"></i></button>";
        html += "<textarea id=\"contact-"+ buddyObj.identity +"-ChatMessage\" class=\"chatMessage cleanScroller\" placeholder=\"Type your message here...\" onkeydown=\"chatOnkeydown(event, this,'"+ buddyObj.identity +"')\" onkeyup=\"chatOnkeyup(event, this,'"+ buddyObj.identity +"')\" onpaste=\"chatOnbeforepaste(event, this,'"+ buddyObj.identity +"')\"></textarea>";
        html += "</div>";

        html += "</td></tr>";
    }
    html += "</table>";

    $("#rightContent").append(html);
}
function RemoveBuddyMessageStream(buddyObj){
    $("#stream-"+ buddyObj.identity).remove();
}
function SelectBuddy(buddy, typeStr) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    var previouslySelectedBuddy = "";
    $(".buddySelected").each(function () {
        $(this).attr('class', 'buddy');
    });
    $("#contact-" + buddy).attr('class', 'buddySelected');

    $(".streamSelected").each(function () {
        $(this).attr('class', 'stream');
    });
    $("#stream-" + buddy).attr('class', 'streamSelected');

    console.log("Switching to: "+ buddy);

    ClearMissedBadge(buddy);

    switchSessions(buddy);

    // Make Select
    for(var b = 0; b < Buddies.length; b++)
    {
        Buddies[b].IsSelected = false;
        if(Buddies[b].identity == buddy) Buddies[b].IsSelected = true;
    }
    selectedBuddy = buddyObj;

    // Change to Stream if in Narrow view
    UpdateUI();
    
    // Refresh Stream
    console.log("Refreshing Stream for you(" + profileUserID + ") and : " + buddyObj.identity);
    RefreshStream(buddyObj);
}
function CloseBuddy(buddy){

    $(".buddySelected").each(function () {
        $(this).attr('class', 'buddy');
    });
    $(".streamSelected").each(function () {
        $(this).attr('class', 'stream');
    });

    console.log("Closing: "+ buddy);

    // Make Select
    for(var b = 0; b < Buddies.length; b++)
    {
        Buddies[b].IsSelected = false;
    }
    selectedBuddy = null;

    // Change to Stream if in Narrow view
    UpdateUI();
}
function RemoveBuddy(buddy){
    // Check if you are on the phone etc
    Confirm("This person will be removed from your list, but can be added again at any time. No data will be deleted. Confrim remove?", "Confirm remove", function(){
        for(var b = 0; b < Buddies.length; b++)
        {
            if(Buddies[b].identity == buddy) {
                RemoveBuddyMessageStream(Buddies[b]);
                Buddies.splice(b, 1);
                break;
            }
        }
        UpdateBuddyList();
    });
}
function FindBuddyByExtNo(ExtNo)
{
    for(var b = 0; b < Buddies.length; b++)
    {
        if(Buddies[b].ExtNo == ExtNo) return Buddies[b];
    }
    return null;
}
function FindBuddyByIdentity(identity)
{
    for(var b = 0; b < Buddies.length; b++)
    {
        if(Buddies[b].identity == identity) return Buddies[b];
    }
    return null;
}
function RefreshStream(buddyObj) {
    var data = "<xml><userId>" + profileUserID + "</userId><withUserId>" + buddyObj.identity + "</withUserId></xml>";
    ajaxRequest = $.ajax({
        url: "/api/json/?action=GetUserStream",
        type: "POST",
        data: data,
        contentType: "text/xml; charset=UTF-8",
        dataType: "json",
        error: function (jqXHR, textStatus, errorThrown) {
            console.log("Ajax request failed:" + jqXHR.statusText + " error: " + errorThrown);
        },
        success: function (json, textStatus, jqXHR) {
            // Done

            // TODO: don't clear, rather sync the data, there could be uploads in place
            $("#contact-" + buddyObj.identity + "-ChatHistory").empty();

            console.log(json);
            console.log("Ajax data Returned: " + textStatus);
            console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
            console.log("Total Rows: " + json.TotalRows);

            $.each(json.DataCollection, function (i, item) {

                var DateTime = moment.utc(item.ItemDate).local().calendar(null, {
                    sameElse: 'YYYY-MM-DD'
                });

                // var DateTime = new Date(item.ItemDate).toLocaleTimeString();
                // moment().utc().format("YYYY-MM-DD HH:mm:ss") +" UTC";

                if (item.ItemType == "MSG") {
                    // Add Chat Message
                    // ===================

                    //Billsec: "0"
                    //Dst: "sip:800"
                    //DstUserId: "8D68C1D442A96B4"
                    //ItemDate: "2019-05-14 09:42:15"
                    //ItemId: "89"
                    //ItemType: "MSG"
                    //MessageData: "........."
                    //Src: ""Keyla James" <100>"
                    //SrcUserId: "8D68B3EFEC8D0F5"

                    var formattedMessage = ReformatMessage(item.MessageData);
                    if (item.SrcUserId == profileUserID) {
                        // You are the source (sending)
                        var imageUrl = "/api/img/?action=GetUserPicture&u=" + item.SrcUserId + "&MaxSize=76";
                        var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"padding-left:8px; padding-right:8px; white-space: nowrap\">";
                        messageString += "<div class=messageDate>" + DateTime + "</div>"
                        messageString += "</td><td>"
                        messageString += "<div class=ourChatMessageText onClick=\"ShowMessgeMenu(this,'MSG','"+  item.ItemId +"','"+ item.Billsec +"')\" style=\"cursor:pointer\">" + formattedMessage + "</div>"
                        messageString += "</td><td style=\"padding-left:8px; padding-right:8px\">"
                        messageString += "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url(" + imageUrl + ")\"></div>"
                        messageString += "</td></tr></table>";
                    }
                    else
                    {
                        // You are the destination (receiving)
                        var ActualSender = "";
                        var imageUrl = "/api/img/?action=GetUserPicture&u=" + item.SrcUserId +"&MaxSize=76";
                        var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr><td style=\"padding-left:8px; padding-right:8px\">";
                        messageString += "<div class=\"buddyIconSmall\" style=\"background-image: url(" + imageUrl + ")\"></div>";
                        messageString += "</td><td>";
                        messageString += "<div class=theirChatMessageText onClick=\"ShowMessgeMenu(this,'MSG','"+  item.ItemId +"','"+ item.Billsec +"')\" style=\"cursor:pointer\">" + formattedMessage + "</div>";
                        messageString += "</td><td style=\"padding-left:8px; padding-right:8px; white-space: nowrap\">";
                        messageString += "<div class=messageDate>" + DateTime + "</div>";
                        if(buddyObj.type == "group"){
                            messageString += "<div class=messageDate>" + ActualSender + "</div>";
                        }
                        messageString += "</td></tr></table>";
                    }
                    $("#contact-" + buddyObj.identity + "-ChatHistory").prepend(messageString);
                }
                else if (item.ItemType == "CDR") {
                    // Add CDR 
                    // =======

                    //Billsec: "31"
                    //Dst: "+27837977605"
                    //DstUserId: ""
                    //ItemDate: "2019-05-14 14:47:45"
                    //ItemId: "818"
                    //ItemType: "CDR"
                    //MessageData: ""
                    //Src: "+44123456789"
                    //SrcUserId: "8D68B3EFEC8D0F5"

                    if (item.SrcUserId == profileUserID) {
                        // You(profileUserID) initiated a call
                        var imageUrl = "/api/img/?action=GetUserPicture&u=" + item.SrcUserId + "&MaxSize=76";
                        var formattedMessage = "<i class=\"fa fa-phone\"></i> You called<!-- " + item.Dst + "-->, and spoke for " + item.Billsec + "seconds.";
                        if(item.Billsec == "0") formattedMessage = "<i class=\"fa fa-phone\"></i> You tried to call<!-- " + item.Dst + "-->.";
                        var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"padding-left:8px; padding-right:8px; white-space: nowrap\">";
                        messageString += "<div class=messageDate>" + DateTime + "</div>";
                        messageString += "</td><td>";
                        messageString += "<div class=ourChatMessageText onClick=\"ShowMessgeMenu(this,'CDR','"+  item.ItemId +"','"+ item.Billsec +"')\" style=\"cursor:pointer\">";
                        messageString += "<div>" + formattedMessage + "<div>"
                        if(false) messageString += "<div>Tags: <div>";
                        if(item.MessageData.lenght >= 1) messageString += "<div>" + item.MessageData + "<div>";
                        messageString += "</div>";
                        messageString += "</td><td style=\"padding-left:8px; padding-right:8px\">";
                        messageString += "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url(" + imageUrl + ")\"></div>";
                        messageString += "</td></tr></table>";
                    }
                    else
                    {
                        // you(profileUserID) received a call
                        var imageUrl = "/api/img/?action=GetUserPicture&u=" + item.SrcUserId +"&MaxSize=76";
                        var formattedMessage = "<i class=\"fa fa-phone\"></i> You received a call<!-- "+ item.Src +"-->, and spoke for " + item.Billsec + "seconds.";
                        if(item.Billsec == "0") formattedMessage = "<i class=\"fa fa-phone\"></i> You missed a call<!-- "+ item.Src +"-->.";
                        var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr><td  style=\"padding-left:8px; padding-right:8px\">";
                        messageString += "<div class=\"buddyIconSmall\" style=\"background-image: url(" + imageUrl + ")\"></div>";
                        messageString += "</td><td>";
                        messageString += "<div class=theirChatMessageText onClick=\"ShowMessgeMenu(this,'CDR','"+  item.ItemId +"','"+ item.Billsec +"')\" style=\"cursor:pointer\">";
                        messageString += "<div>" + formattedMessage + "<div>"
                        if(false) messageString += "<div>Tags: <div>";
                        if(item.MessageData.lenght >= 1) messageString += "<div>" + item.MessageData + "<div>";
                        messageString += "</div>";
                        messageString += "</td><td  style=\"padding-left:8px; padding-right:8px; white-space: nowrap\">";
                        messageString += "<div class=messageDate>" + DateTime + "</div>";
                        messageString += "</td></tr></table>";
                    }
                    $("#contact-" + buddyObj.identity + "-ChatHistory").prepend(messageString);
                }
                updateScroll(buddyObj.identity);
            });
        }
    });
}

// Stream Functionality
// =====================
function ShowMessgeMenu(obj, typeStr, itemId, billSec) {
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    if(dhtmlxPopup != null)
    {
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;
    }
    dhtmlxPopup = new dhtmlXPopup();
    // dhtmlxPopup.attachHTML("<i class=\"fa fa-spinner\"i></i>");

    var menu = null;
    // CDR's Menu
    if (typeStr == "CDR") {
        menu = [
            { id: 1, name: "<i class=\"fa fa-external-link\"></i> Show Call Detail Record" },
            { id: 2, name: "<i class=\"fa fa-tags\"></i> Tag Call" },
            { id: 3, name: "<i class=\"fa fa-flag\"></i> Flag Call" },
            { id: 4, name: "<i class=\"fa fa-quote-left\"></i> Edit Comment" },
        ];
    }
    // 
    if (typeStr == "MSG") {
        menu = [
            { id: 5, name: "<i class=\"fa fa-clipboard\"></i> Copy Message" },
            { id: 6, name: "<i class=\"fa fa-pencil\"></i> Edit Message" },
            { id: 7, name: "<i class=\"fa fa-quote-left\"></i> Quote Message" }
        ];
    }

    dhtmlxPopup.attachList("name", menu);
    dhtmlxPopup.attachEvent("onClick", function(id){
        console.log("Menu Clicked: ");
        dhtmlxPopup.hide();

        // Show Call Detail Record
        if(id == 1){
            // parent.AddTab("CDR Details", "/Page.aspx?PageType=Tab&PageId=exten-cdr-details&id=" + itemId, true);
        }




    });
    dhtmlxPopup.show(x, y, w, h);


    /*
    if (typeStr == "CDR") {
        console.log("Getting CDR details (" + itemId + ")");
        var data = "<xml><cdrid>"+ itemId +"</cdrid></xml>"
        $.ajax({
            url: "/api/json/?action=GetCdrDetails",
            type: "POST",
            data: data,
            contentType: "text/xml; charset=UTF-8",
            dataType: "json",
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Ajax request failed:" + jqXHR.statusText + " error: " + errorThrown);
            },
            success: function (json, textStatus, jqXHR) {
                console.log("Ajax data Returned: " + textStatus);
                console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
                // Done
                dhtmlxPopup.attachHTML("...");
            }
        });
    }
    */
}

// My Profile
// ==========
function ShowMyProfileMenu(buddy, obj){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    if(dhtmlxPopup != null)
    {
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;
    }
    dhtmlxPopup = new dhtmlXPopup();
    dhtmlxPopup.attachList("name,enabled", [
						{id: 1, name: "<i class=\"fa fa-laptop\"></i> Select Registration", enabled: ""},
						{id: 2, name: "<i class=\"fa fa-refresh\"></i> Refresh Registration", enabled: ""},
						{id: 3, name: "<i class=\"fa fa-wrench\"></i> Configure Extension", enabled: ""},
						dhtmlxPopup.separator,
						{id: 4, name: "<i class=\"fa fa-user-plus\"></i> Add Someone", enabled: ""},
						{id: 5, name: "<i class=\"fa fa-users\"></i><i class=\"fa fa-plus\" style=\"font-size:9px\"></i> Create Group", enabled: ""},
						dhtmlxPopup.separator,
						{id: 6, name: "<i class=\"fa fa-phone\"></i> Auto Answer", enabled: "<i class=\"fa fa-check\"></i>"},
						{id: 7, name: "<i class=\"fa fa-ban\"></i> Do No Disturb", enabled: ""},
						{id: 8, name: "<i class=\"fa fa-cogs\"></i> Advanced Settings", enabled: ""}
                        // Call Waiting
                        // Advanced Settings.. Register Automatically, Ring Tone, Ring Device, Volume, Onscreen Notification, CRM Hooks
    ]);
    dhtmlxPopup.show(x, y, w, h);
}
function ShowBuddyProfileMenu(buddy, obj, typeStr){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    if(dhtmlxPopup != null)
    {
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;
    }
    dhtmlxPopup = new dhtmlXPopup();
    if(typeStr == "extension")
    {
        var html = "<div style=\"width:200px\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('/api/img/?action=GetUserPicture&u="+ buddy +"&MaxSize=340')\"></div>";
        html += "<div id=ProfileInfo style=\"text-align:center\"><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);

        // Get The List from the Server
        // ============================
        var action = "GetUser";
        var data = "<xml><uID>" + buddy + "</uID></xml>";
        ajaxRequest = $.ajax({
            url: "/api/json/?action=" + action,
            type: "POST",
            data: data,
            contentType: "text/xml; charset=UTF-8",
            dataType: "json",
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Ajax request failed:" + jqXHR.statusText + " error: " + errorThrown);
            },
            success: function (json, textStatus, jqXHR) {
                console.log("Ajax data Returned: " + textStatus);
                console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
                // Done
                $("#ProfileInfo").html("");

                $("#ProfileInfo").append("<div class=ProfileTextLarge style=\"margin-top:15px\">"+ json.DataObject.DisplayName +"</div>");

                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Position</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.Position +"</div>");

                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Extension Number</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.ExtNo +" </div>");

                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Email</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.Email +" </div>");

                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Mobile</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.MobileNo +" </div>");

            }
        });
    }
    else if(typeStr == "contact"){
        var html = "<div style=\"width:200px\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('/api/img/?action=GetContactPicture&c="+ buddy +"&MaxSize=340')\"></div>";
        html += "<div id=ProfileInfo style=\"text-align:center\"><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);

        // Get The List from the Server
        // ============================
        var action = "GetContact";
        var data = "<xml><cID>" + buddy + "</cID></xml>";
        ajaxRequest = $.ajax({
            url: "/api/json/?action=" + action,
            type: "POST",
            data: data,
            contentType: "text/xml; charset=UTF-8",
            dataType: "json",
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Ajax request failed:" + jqXHR.statusText + " error: " + errorThrown);
            },
            success: function (json, textStatus, jqXHR) {
                console.log("Ajax data Returned: " + textStatus);
                console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
                // Done
                $("#ProfileInfo").html("");

                $("#ProfileInfo").append("<div class=ProfileTextLarge style=\"margin-top:15px\">"+ json.DataObject.DisplayName +"</div>");

                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Description</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.Description +"</div>");
                if(json.DataObject.TelNumber1Flag != ""){
                    $("#ProfileInfo").append("<div class=ProfileTextMedium style=\"margin-top:15px\"><img src=\""+ json.DataObject.TelNumber1Flag +"\" class=\"smallFlag\">"+ json.DataObject.TelNumber1 +" </div>");
                }
                else {
                    $("#ProfileInfo").append("<div class=ProfileTextMedium style=\"margin-top:15px\">"+ json.DataObject.TelNumber1 +" </div>");
                }
                if(json.DataObject.TelNumber2Flag != ""){
                    $("#ProfileInfo").append("<div class=ProfileTextMedium><img src=\""+ json.DataObject.TelNumber2Flag +"\" class=\"smallFlag\">"+ json.DataObject.TelNumber2 +" </div>");
                }
                else {
                    $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.TelNumber2 +" </div>");
                }
                $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Email</div>");
                $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ json.DataObject.Email +" </div>");

            }
        });
    }
    else if(typeStr == "group"){
        var html = "<div style=\"width:200px\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('/api/img/?action=GetGroupPicture&g="+ buddy +"&MaxSize=340')\"></div>";
        html += "<div id=ProfileInfo><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);

        // Get The List from the Server
        // ============================
        var action = "GetBuddyGroup";
        var data = "<xml><gID>" + buddy + "</gID></xml>";
        ajaxRequest = $.ajax({
            url: "/api/json/?action=" + action,
            type: "POST",
            data: data,
            contentType: "text/xml; charset=UTF-8",
            dataType: "json",
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Ajax request failed:" + jqXHR.statusText + " error: " + errorThrown);
            },
            success: function (json, textStatus, jqXHR) {
                console.log("Ajax data Returned: " + textStatus);
                console.log("Execution Time: " + json.ExecuteTimeSec + " seconds");
                // Done
                $("#ProfileInfo").html("");

            }
        });

    }
    dhtmlxPopup.show(x, y, w, h);
}

// Device and Settings
// ===================
function ChangeSettings(buddy, obj){

    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    if(dhtmlxPopup != null)
    {
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;
    }
    dhtmlxPopup = new dhtmlXPopup();

    var audioSelect = $('<select/>');
    audioSelect.attr("id", "audioSrcSelect");
    audioSelect.css("width", "350px");

    var videoSelect = $('<select/>');
    videoSelect.attr("id", "videoSrcSelect");
    videoSelect.css("width", "350px");

    var speakerSelect = $('<select/>');
    speakerSelect.attr("id", "audioOutputSelect");
    speakerSelect.css("width", "350px");

    var ringerSelect = $('<select/>');
    ringerSelect.attr("id", "ringerSelect");
    ringerSelect.css("width", "350px");

    var session = getSession(buddy);

    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        
        var foundVideoSourceDevices = false;
        for (var i = 0; i < deviceInfos.length; ++i) {

            var deviceInfo = deviceInfos[i];
            var devideId = deviceInfo.deviceId;

            var option = $('<option/>');
            option.attr("value", devideId);

            console.log("Found Device: ", deviceInfo.label);

            if (deviceInfo.kind === "audioinput") {
                option.text(deviceInfo.label || "Microphone (" + devideId + ")");
                audioSelect.append(option);
            }
            else if (deviceInfo.kind === "audiooutput") {
                option.text(deviceInfo.label || "Speaker (" + devideId + ")");
                speakerSelect.append(option);
            }
            else if (deviceInfo.kind === "videoinput") {
                if(session != null)
                {
                    // We are on a call
                    if(session.data.VideoSourceDevice == devideId)
                    {
                        option.attr("selected", true);
                    }
                } 
                else {
                    // Not on a call
                    if($("#videoSrc").val() == devideId){
                        option.attr("selected", true);
                    }
                }
                option.text(deviceInfo.label || "Webcam  (" + devideId + ")");
                videoSelect.append(option);
            }
        }

        // Add default Option
        // ==================
        var defaultVideoOption = $('<option/>');
        defaultVideoOption.attr("value", "default");
        defaultVideoOption.text("(Default)");
        if(session != null)
        {
            // We are on a call
            if(session.data.VideoSourceDevice == "default")
            {
                defaultVideoOption.attr("selected", true);
            } 
            
        }
        else {
            // Not on a call
            if($("#videoSrc").val() == "default"){
                defaultVideoOption.attr("selected", true);
            }
        }
        videoSelect.append(defaultVideoOption);

        // Add Scratchpad Option
        // =====================
        var scratchpadOption = $('<option/>');
        scratchpadOption.attr("value", "scratchpad");
        scratchpadOption.text("Scratchpad");
        if(session != null)
        {
            // We are on a call
            if(session.data.VideoSourceDevice == "scratchpad")
            {
                scratchpadOption.attr("selected", true);
            }
        }
        videoSelect.append(scratchpadOption);

        // Add Screen Option
        // =================
        var screenOption = $('<option/>');
        screenOption.attr("value", "screen");
        screenOption.text("My Screen");
        if(session != null)
        {
            // We are on a call
            if(session.data.VideoSourceDevice == "screen")
            {
                screenOption.attr("selected", true);
            }
        }
        videoSelect.append(screenOption);

        // Add Video Option
        // ================
        var videoOption = $('<option/>');
        videoOption.attr("value", "video");
        videoOption.text("Choose Video...");
        if(session != null)
        {
            // We are on a call
            if(session.data.VideoSourceDevice == "video")
            {
                videoOption.attr("selected", true);
            }
        }
        videoSelect.append(videoOption);

        // Handle Audio Source changes (Microphone)
        // ========================================
        audioSelect.change(function(){
            console.log("Call to change Microphone");
            $("#audioSrc").val(this.value); // For subsequent calls

            // Switch Tracks if you are in a call
            // ==================================
            var session = getSession(buddy);
            if(session != null){
                var constraints = {
                    audio: {
                        deviceId: { exact: $("#audioSrc").val() }
                    },
                    video: false
                }
                navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
                    var newMediaTrack = newStream.getAudioTracks()[0];
                    var pc = session.sessionDescriptionHandler.peerConnection;
                    pc.getSenders().forEach(function (RTCRtpSender) {
                        if(RTCRtpSender.track.kind == "audio") {
                            console.log("Switching Audio Track : "+ RTCRtpSender.track.label + " to "+ newMediaTrack.label);
                            RTCRtpSender.track.stop();
                            RTCRtpSender.replaceTrack(newMediaTrack);
                        }
                    });
                }).catch(function(){
                    console.error("Error on getUserMedia");
                });             
            }

            dhtmlxPopup.hide();
            dhtmlxPopup.unload();
            dhtmlxPopup = null;
        });

        // Handle output change (speaker)
        // ==============================
        speakerSelect.change(function(){
            console.log("Call to change Speaker");
            $("#audioOutput").val(this.value);

            // Also change the sinkId
            // ======================
            var sinkId = this.value;
            console.log("Attempting to set Audio Output SinkID for "+ buddy +" [" + sinkId + "]");

            // Remote Audio
            var element = $("#contact-"+ buddy +"-remoteAudio").get(0);
            element.setSinkId(sinkId);

            // Remote Video
            var element = $("#contact-"+ buddy +"-remoteVideo").get(0);
            element.setSinkId(sinkId);

            dhtmlxPopup.hide();
            dhtmlxPopup.unload();
            dhtmlxPopup = null;
        });

        // Handle video input change (WebCam)
        // ==================================
        videoSelect.change(function(){
            console.log("Call to change WebCam");

            if(this.value == "video")
            {
                var session = getSession(buddy);
                if(session != null)
                {
                    var onOk = function(){
                        console.log("About to send video feed...");
                        SendVideo(buddy, "selected video source");
                    }
                    // OpenWindow('/Page.aspx?PageType=Window&pageId=', 'Select Video', 480, 640, false, false);
                    onOk();
                } 
                else {
                    Alert("You must be in a Video call to select this option.");
                }

                dhtmlxPopup.hide();
                dhtmlxPopup.unload();
                dhtmlxPopup = null;

                return;
            } else if(this.value == "scratchpad") {
                var session = getSession(buddy);
                if(session != null)
                {
                    SendCanvas(buddy);
                } 
                else {
                    Alert("You must be in a Video call to select this option.");
                }

                dhtmlxPopup.hide();
                dhtmlxPopup.unload();
                dhtmlxPopup = null;

                return;
            } else if(this.value == "screen") {
                var session = getSession(buddy);
                if(session != null)
                {
                    ShareScreen(buddy);
                } 
                else {
                    Alert("You must be in a Video call to select this option.");
                }

                dhtmlxPopup.hide();
                dhtmlxPopup.unload();
                dhtmlxPopup = null;

                return;
            }
            else {

                // Switch Tracks if you are in a call
                // ==================================
                var session = getSession(buddy);
                if(session != null){
                    switchVideoSource(buddy, this.value)
                }

                console.log("Saving default Video Source Device as: "+ this.value);
                $("#videoSrc").val(this.value);

                dhtmlxPopup.hide();
                dhtmlxPopup.unload();
                dhtmlxPopup = null;

                return;
            }
        });

        // Show Popup
        // ==========
        dhtmlxPopup.attachHTML("<div id=DeviceSelector style=\"width:350px\"></DIV>");
        
        $("#DeviceSelector").append("<div style=\"margin-top:20px\">Audio Source (Microphone) Device: </div>");
        $("#DeviceSelector").append(audioSelect);
        $("#DeviceSelector").append("<div style=\"margin-top:20px\">Audio Output (Speaker) Device: </div>");
        $("#DeviceSelector").append(speakerSelect);
        $("#DeviceSelector").append("<div style=\"margin-top:20px\">Video Source (WebCam) Device: </div>");
        $("#DeviceSelector").append(videoSelect);

        dhtmlxPopup.show(x, y, w, h);

    }).catch(function (error) {
        console.error("Upgade Chrome! [" + error + "]");
    });
}


function ToggleThisHeight(obj,smallHeight,bigHeight)
{
    var $Obj = $(obj);
    if($Obj.height() == smallHeight){
        $Obj.find("i").attr("class", "fa fa-caret-down");
        $Obj.css("height", bigHeight + "px");
    }
    else if($Obj.height() == bigHeight)
    {
        $Obj.find("i").attr("class", "fa fa-caret-right");
        $Obj.css("height", smallHeight + "px");
    }

}

// Chatting
// ========
function chatOnbeforepaste(event, obj, buddy)
{
    console.log("Handle paste, checking for Images...");
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;

    // find pasted image among pasted items
    var preventDefault = false;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") === 0) {
            console.log("Image found! Opening image editor...");

            var blob = items[i].getAsFile();

            // read the image in
            var reader = new FileReader();
            reader.onload = function (event) {

                // Image has loaded, open Image Preview editer
                // ===========================================
                console.log("Image loaded... setting placeholder...");
                var placeholderImage = new Image();
                placeholderImage.onload = function () {

                    console.log("Placeholder loaded... CreateImageEditor...");

                    CreateImageEditor(buddy, placeholderImage);
                };
                placeholderImage.src = event.target.result;

                // $("#contact-" + buddy + "-msgPreviewhtml").html("<img src=\""+ event.target.result +"\" style=\"max-width:320px; max-height:240px\" />");
                // $("#contact-" + buddy + "-msgPreview").show();
            };
            reader.readAsDataURL(blob);

            preventDefault = true;
            continue;
        }
    }

    // Pevent default if you found an image
    if (preventDefault) event.preventDefault();
}
function chatOnkeydown(event, obj, buddy) {
    // handle paste, etc
    RefreshChatPreview(event, $.trim($(obj).val()), buddy);
}
function chatOnkeyup(event, obj, buddy) {
    RefreshChatPreview(event, $.trim($(obj).val()), buddy);
}
function RefreshChatPreview(event, str, buddy) {
    if (str != "") {
        var chatMessage = ReformatMessage(str);

        $("#contact-" + buddy + "-msgPreviewhtml").html(chatMessage);
        $("#contact-" + buddy + "-msgPreview").show();
    }
    else {
        ClearChatPreview(buddy);
    }
}
function ClearChatPreview(buddy) {
    $("#contact-" + buddy + "-msgPreviewhtml").html("");
    $("#contact-" + buddy + "-msgPreview").hide();
}
function ReformatMessage(str) {
    var msg = str;
    // Simple tex=>HTML 
    msg = msg.replace(/</gi, "&lt;");
    msg = msg.replace(/>/gi, "&gt;");
    msg = msg.replace(/\n/gi, "<br>");
    // Emojy
    // Skype: :) :( :D :O ;) ;( (:| :| :P :$ :^) |-) |-( :x ]:)
    // (cool) (hearteyes) (stareyes) (like) (unamused) (cwl) (xd) (pensive) (weary) (hysterical) (flushed) (sweatgrinning) (disappointed) (loudlycrying) (shivering) (expressionless) (relieved) (inlove) (kiss) (yawn) (puke) (doh) (angry) (wasntme) (worry) (confused) (veryconfused) (mm) (nerd) (rainbowsmile) (devil) (angel) (envy) (makeup) (think) (rofl) (happy) (smirk) (nod) (shake) (waiting) (emo) (donttalk) (idea) (talk) (swear) (headbang) (learn) (headphones) (morningafter) (selfie) (shock) (ttm) (dream)
    msg = msg.replace(/(:\)|:\-\)|:o\))/g, String.fromCodePoint(0x1F642));     // :) :-) :o)
    msg = msg.replace(/(:\(|:\-\(|:o\()/g, String.fromCodePoint(0x1F641));     // :( :-( :o(
    msg = msg.replace(/(;\)|;\-\)|;o\))/g, String.fromCodePoint(0x1F609));     // ;) ;-) ;o)
    msg = msg.replace(/(:'\(|:'\-\()/g, String.fromCodePoint(0x1F62A));        // :'( :'‑(
    msg = msg.replace(/(:'\(|:'\-\()/g, String.fromCodePoint(0x1F602));        // :') :'‑)
    msg = msg.replace(/(:\$)/g, String.fromCodePoint(0x1F633));                // :$
    msg = msg.replace(/(>:\()/g, String.fromCodePoint(0x1F623));               // >:(
    msg = msg.replace(/(:\×)/g, String.fromCodePoint(0x1F618));                // :×
    msg = msg.replace(/(:\O|:\‑O)/g, String.fromCodePoint(0x1F632));             // :O :‑O
    msg = msg.replace(/(:P|:\-P|:p|:\-p)/g, String.fromCodePoint(0x1F61B));      // :P :-P :p :-p
    msg = msg.replace(/(;P|;\-P|;p|;\-p)/g, String.fromCodePoint(0x1F61C));      // ;P ;-P ;p ;-p
    msg = msg.replace(/(:D|:\-D)/g, String.fromCodePoint(0x1F60D));             // :D :-D

    msg = msg.replace(/(\(like\))/g, String.fromCodePoint(0x1F44D));           // (like)

    // Make clickable Hyperlinks
    msg = msg.replace(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/gi, function (x) {
        var niceLink = (x.length > 50) ? x.substring(0, 47) + "..." : x;
        var rtn = "<A target=_blank class=previewHyperlink href=\"" + x + "\">" + niceLink + "</A>";
        return rtn;
    });
    return msg;
}

// Image Editor
// ============
function CreateImageEditor(buddy, placeholderImage){
    // Show Interface
    // ==============
    console.log("Setting Up ImageEditor...");
    if($("#contact-" + buddy + "-imagePastePreview").is(":visible")) {
        console.log("Resetting ImageEditor...");
        $("#contact-" + buddy + "-imagePastePreview").empty();
        RemoveCanvas("contact-" + buddy + "-imageCanvas")
    } else {
        $("#contact-" + buddy + "-imagePastePreview").show();
    }
    // Create UI
    // =========

    var toolBarDiv = $('<div/>');
    toolBarDiv.css("margin-bottom", "5px")
    toolBarDiv.append('<button class="toolBarButtons" title="Select" onclick="ImageEditor_Select(\''+ buddy +'\')"><i class="fa fa-mouse-pointer"></i></button>');
    toolBarDiv.append('&nbsp;|&nbsp;');
    toolBarDiv.append('<button class="toolBarButtons" title="Draw" onclick="ImageEditor_FreedrawPen(\''+ buddy +'\')"><i class="fa fa-pencil"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Paint" onclick="ImageEditor_FreedrawPaint(\''+ buddy +'\')"><i class="fa fa-paint-brush"></i></button>');
    toolBarDiv.append('&nbsp;|&nbsp;');
    toolBarDiv.append('<button class="toolBarButtons" title="Select Line Color" onclick="ImageEditor_SetectLineColor(\''+ buddy +'\')"><i class="fa fa-pencil-square-o" style="color:rgb(255, 0, 0)"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Select Fill Color" onclick="ImageEditor_SetectFillColor(\''+ buddy +'\')"><i class="fa fa-pencil-square" style="color:rgb(255, 0, 0)"></i></button>');
    toolBarDiv.append('&nbsp;|&nbsp;');
    toolBarDiv.append('<button class="toolBarButtons" title="Add Circle" onclick="ImageEditor_AddCircle(\''+ buddy +'\')"><i class="fa fa-circle"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Add Rectangle" onclick="ImageEditor_AddRectangle(\''+ buddy +'\')"><i class="fa fa-stop"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Add Triangle" onclick="ImageEditor_AddTriangle(\''+ buddy +'\')"><i class="fa fa-play"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Add Emoji" onclick="ImageEditor_SetectEmoji(\''+ buddy +'\')"><i class="fa fa-smile-o"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Add Text" onclick="ImageEditor_AddText(\''+ buddy +'\')"><i class="fa fa-font"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Delete Selected Items" onclick="ImageEditor_Clear(\''+ buddy +'\')"><i class="fa fa-times"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Clear All" onclick="ImageEditor_ClearAll(\''+ buddy +'\')"><i class="fa fa-trash"></i></button>');
    toolBarDiv.append('&nbsp;|&nbsp;');
    toolBarDiv.append('<button class="toolBarButtons" title="Pan" onclick="ImageEditor_Pan(\''+ buddy +'\')"><i class="fa fa-hand-paper-o"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Zoom In" onclick="ImageEditor_ZoomIn(\''+ buddy +'\')"><i class="fa fa-search-plus"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Zoom Out" onclick="ImageEditor_ZoomOut(\''+ buddy +'\')"><i class="fa fa-search-minus"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Reset Pan & Zoom" onclick="ImageEditor_ResetZoom(\''+ buddy +'\')"><i class="fa fa-search" aria-hidden="true"></i></button>');
    toolBarDiv.append('&nbsp;|&nbsp;');
    toolBarDiv.append('<button class="toolBarButtons" title="Cancel" onclick="ImageEditor_Cancel(\''+ buddy +'\')"><i class="fa fa-times-circle"></i></button>');
    toolBarDiv.append('<button class="toolBarButtons" title="Send" onclick="ImageEditor_Send(\''+ buddy +'\')"><i class="fa fa-paper-plane"></i></button>');
    $("#contact-" + buddy + "-imagePastePreview").append(toolBarDiv);

    // Create the canvas
    // =================
    var newCanvas = $('<canvas/>');
    newCanvas.attr("id", "contact-" + buddy + "-imageCanvas");
    newCanvas.css("border", "1px solid #CCCCCC");
    $("#contact-" + buddy + "-imagePastePreview").append(newCanvas);
    console.log("Canvas for ImageEditor created...");

    var imgWidth = placeholderImage.width;
    var imgHeight = placeholderImage.height;
    var maxWidth = $("#contact-" + buddy + "-imagePastePreview").width()-2; // for the border
    var maxHeight = 480;
    $("#contact-" + buddy + "-imageCanvas").attr("width", maxWidth);
    $("#contact-" + buddy + "-imageCanvas").attr("height", maxHeight);

    // Handle Initial Zoom
    var zoomToFitImage = 1;
    var zoomWidth = 1;
    var zoomHeight = 1;
    if(imgWidth > maxWidth || imgHeight > maxHeight)
    {
        if(imgWidth > maxWidth)
        {
            zoomWidth = (maxWidth / imgWidth);
        }
        if(imgHeight > maxHeight)
        {
            zoomHeight = (maxHeight / imgHeight);
            console.log("Scale to fit height: "+ zoomHeight);
        }
        zoomToFitImage = Math.min(zoomWidth, zoomHeight) // need the smallest because less is more zoom.
        console.log("Scale down to fit: "+ zoomToFitImage);

        // Shape the canvas to fit the image and the new zoom
        imgWidth = imgWidth * zoomToFitImage;
        imgHeight = imgHeight * zoomToFitImage;
        console.log("resizing canvas to fit new image size...");
        $("#contact-" + buddy + "-imageCanvas").attr("width", imgWidth);
        $("#contact-" + buddy + "-imageCanvas").attr("height", imgHeight);
    }
    else {
        console.log("Image is able to fit, resizing canvas...");
        $("#contact-" + buddy + "-imageCanvas").attr("width", imgWidth);
        $("#contact-" + buddy + "-imageCanvas").attr("height", imgHeight);
    }

    // $("#contact-" + buddy + "-imageCanvas").css("cursor", "zoom-in");

    // Fabric Canvas API
    // =================
    console.log("Creating fabric API...");
    var canvas = new fabric.Canvas("contact-" + buddy + "-imageCanvas");
    canvas.id = "contact-" + buddy + "-imageCanvas";
    canvas.ToolSelected = "None";
    canvas.PenColour = "rgb(255, 0, 0)";
    canvas.PenWidth = 2;
    canvas.PaintColour = "rgba(227, 230, 3, 0.6)";
    canvas.PaintWidth = 10;
    canvas.FillColour = "rgb(255, 0, 0)";
    canvas.isDrawingMode = false;

    canvas.selectionColor = 'rgba(112,179,233,0.25)';
    canvas.selectionBorderColor = 'rgba(112,179,233, 0.8)';
    canvas.selectionLineWidth = 1;

    // canvas.setCursor('default');
    // canvas.rotationCursor = 'crosshair';
    // canvas.notAllowedCursor = 'not-allowed'
    // canvas.moveCursor = 'move';
    // canvas.hoverCursor = 'move';
    // canvas.freeDrawingCursor = 'crosshair';
    // canvas.defaultCursor = 'move';

    // canvas.selection = false; // Indicates whether group selection should be enabled
    // canvas.selectionKey = 'shiftKey' // Indicates which key or keys enable multiple click selection

    // Zoom to fit Width or Height
    // ===========================
    canvas.setZoom(zoomToFitImage);

    // Canvas Events
    // =============
    canvas.on('mouse:down', function(opt) {
        var evt = opt.e;

        if (this.ToolSelected == "Pan") {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
        }
        // Make nicer grab handles
        if(opt.target != null){
            if(evt.altKey === true)
            {
                opt.target.lockMovementX = true;
            }
            if(evt.shiftKey === true)
            {
                opt.target.lockMovementY = true;
            }
            opt.target.set({
                transparentCorners: false,
                borderColor: 'rgba(112,179,233, 0.4)',
                cornerColor: 'rgba(112,179,233, 0.8)',
                cornerSize: 6
            });
        }
    });
    canvas.on('mouse:move', function(opt) {
        if (this.isDragging) {
            var e = opt.e;
            this.viewportTransform[4] += e.clientX - this.lastPosX;
            this.viewportTransform[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    });
    canvas.on('mouse:up', function(opt) {
        this.isDragging = false;
        this.selection = true;
        if(opt.target != null){
            opt.target.lockMovementX = false;
            opt.target.lockMovementY = false;
        }
    });
    canvas.on('mouse:wheel', function(opt) {
        var delta = opt.e.deltaY;
        var pointer = canvas.getPointer(opt.e);
        var zoom = canvas.getZoom();
        zoom = zoom + delta/200;
        if (zoom > 10) zoom = 10;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Add Image
    // ==========
    canvas.backgroundImage = new fabric.Image(placeholderImage);

    CanvasCollection.push(canvas);

    // Add Key Press Events
    // ====================
    $("#contact-" + buddy + "-imagePastePreview").keydown(function(evt) {
        evt = evt || window.event;
        var key = evt.keyCode;
        console.log("Key press on Image Editor ("+ buddy +"): "+ key);

        // Delete Key
        if (key == 46) ImageEditor_Clear(buddy);
    });

    console.log("ImageEditor: "+ canvas.id +" created");

    ImageEditor_FreedrawPen(buddy);
}

function GetCanvas(canvasId){
    for(var c = 0; c < CanvasCollection.length; c++){
        try {
            if(CanvasCollection[c].id == canvasId) return CanvasCollection[c];
        } catch(e) {
            console.warn("CanvasCollection.id not available");
        }
    }
    return null;
}
function RemoveCanvas(canvasId){
    for(var c = 0; c < CanvasCollection.length; c++){
        try{
            if(CanvasCollection[c].id == canvasId)
            {
                console.log("Found Old Canvas, Disposing...");

                CanvasCollection[c].clear()
                CanvasCollection[c].dispose();

                CanvasCollection[c].id = "--deleted--";

                console.log("CanvasCollection.splice("+ c +", 1)");
                CanvasCollection.splice(c, 1);
            }
        }
        catch(e){ }
    }
    console.log("There are "+ CanvasCollection.length +" canvas now.");
}

var ImageEditor_Select = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null) {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        return true;
    }
    return false;
}
var ImageEditor_FreedrawPen = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null) {
        canvas.freeDrawingBrush.color = canvas.PenColour;
        canvas.freeDrawingBrush.width = canvas.PenWidth;
        canvas.ToolSelected = "Draw";
        canvas.isDrawingMode = true;
        console.log(canvas)
        return true;
    }
    return false;
}
var ImageEditor_FreedrawPaint = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null) {
        canvas.freeDrawingBrush.color = canvas.PaintColour;
        canvas.freeDrawingBrush.width = canvas.PaintWidth;
        canvas.ToolSelected = "Paint";
        canvas.isDrawingMode = true;
        return true;
    }
    return false;
}
var ImageEditor_Pan = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "Pan";
        canvas.isDrawingMode = false;
        return true;
    }
    return false;
}
var ImageEditor_ResetZoom = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.setZoom(1);
        canvas.setViewportTransform([1,0,0,1,0,0]);
        // canvas.viewportTransform[4] = 0;
        // canvas.viewportTransform[5] = 0;
        return true;
    } 
    return false;
}
var ImageEditor_ZoomIn = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        var zoom = canvas.getZoom();
        zoom = zoom + 0.5;
        if (zoom > 10) zoom = 10;
        if (zoom < 0.1) zoom = 0.1;

        var point = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
        var center = fabric.util.transformPoint(point, canvas.viewportTransform);

        canvas.zoomToPoint(point, zoom);

        return true;
    }
    return false;
}
var ImageEditor_ZoomOut = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        var zoom = canvas.getZoom();
        zoom = zoom - 0.5;
        if (zoom > 10) zoom = 10;
        if (zoom < 0.1) zoom = 0.1;

        var point = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
        var center = fabric.util.transformPoint(point, canvas.viewportTransform);

        canvas.zoomToPoint(point, zoom);

        return true;
    }
    return false;
}

var ImageEditor_AddCircle = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        var circle = new fabric.Circle({
            radius: 20, fill: canvas.FillColour
        })
        canvas.add(circle);
        canvas.centerObject(circle);
        canvas.setActiveObject(circle);
        return true;
    }
    return false;
}
var ImageEditor_AddRectangle = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        var rectangle = new fabric.Rect({ 
            width: 40, height: 40, fill: canvas.FillColour
        })
        canvas.add(rectangle);
        canvas.centerObject(rectangle);
        canvas.setActiveObject(rectangle);
        return true;
    }
    return false;
}
var ImageEditor_AddTriangle = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        var triangle = new fabric.Triangle({
            width: 40, height: 40, fill: canvas.FillColour
        })
        canvas.add(triangle);
        canvas.centerObject(triangle);
        canvas.setActiveObject(triangle);
        return true;
    }
    return false;
}
var ImageEditor_AddEmoji = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        var text = new fabric.Text(String.fromCodePoint(0x1F642), { fontSize : 24 });
        canvas.add(text);
        canvas.centerObject(text);
        canvas.setActiveObject(text);
        return true;
    }
    return false;
}
var ImageEditor_AddText = function (buddy, textString){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        var text = new fabric.IText(textString, { fill: canvas.FillColour, fontFamily: 'arial', fontSize : 18 });
        canvas.add(text);
        canvas.centerObject(text);
        canvas.setActiveObject(text);
        return true;
    }
    return false;
}

var ImageEditor_Clear = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;

        var activeObjects = canvas.getActiveObjects();
        for (var i=0; i<activeObjects.length; i++){
            canvas.remove(activeObjects[i]);
        }
        canvas.discardActiveObject();

        return true;
    }
    return false;
}
var ImageEditor_ClearAll = function (buddy){
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        var savedBgImage = canvas.backgroundImage;

        canvas.ToolSelected = "none";
        canvas.isDrawingMode = false;
        canvas.clear();

        canvas.backgroundImage = savedBgImage;
        return true;
    }
    return false;
}
var ImageEditor_Cancel = function (buddy){
    console.log("Removing ImageEditor...");

    $("#contact-" + buddy + "-imagePastePreview").empty();
    RemoveCanvas("contact-" + buddy + "-imageCanvas");
    $("#contact-" + buddy + "-imagePastePreview").hide();
}

var ImageEditor_Send = function (buddy)
{
    var canvas = GetCanvas("contact-" + buddy + "-imageCanvas");
    if(canvas != null)
    {
        var imgData = canvas.toDataURL({ format: 'png' });
        SendImageDataMessage(buddy, imgData);
        return true;
    }
    return false;
}

// Find something in the message stream
// ====================================
function FindSomething(buddy) {
    $("#contact-" + buddy + "-search").toggle();
}

// FileShare an Upload
// ===================
var allowDradAndDrop = function() {
    var div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}
function onFileDragDrop(e, buddy){
    // drop

    var filesArray = e.dataTransfer.files;
    console.log("You are about to upload " + filesArray.length + " file.");

    // Clear style
    $("#contact-"+ buddy +"-ChatHistory").css("outline", "none");

    for (var f = 0; f < filesArray.length; f++){
        var fileObj = filesArray[f];
        var reader = new FileReader();
        reader.onload = function (event) {
            // console.log(event.target.result);
            
            // Check if the file is under 50MB
            if(fileObj.size <= 52428800){
                // Add to Stream
                // =============
                SendFileDataMessage(buddy, event.target.result, fileObj.name, fileObj.size);
            }
            else{
                alert("The file '"+ fileObj.name +"' is bigger than 50MB, you cannot upload this file")
            }
        };
        console.log("Adding: "+ fileObj.name + " of size: "+ fileObj.size +"bytes");
        reader.readAsDataURL(fileObj);
    }

    // Prevent Default
    preventDefault(e);
}
function cancelDragDrop(e, buddy){
    // dragleave dragend
    $("#contact-"+ buddy +"-ChatHistory").css("outline", "none");
    preventDefault(e);
}
function setupDragDrop(e, buddy){
    // dragover dragenter
    $("#contact-"+ buddy +"-ChatHistory").css("outline", "2px dashed #184369");
    preventDefault(e);
}
function preventDefault(e)
{
    e.preventDefault();
    e.stopPropagation();
}


// UI Elements
// ===========
var alertObj = null;
var confirmObj = null;
var promptObj = null;

var windowsCollection = new dhtmlXWindows("material"); 
var messagingCollection = new dhtmlXWindows("material");

function OpenWindow(url, title, height, width, hideCloseButton, allowResize) {
    console.log("Open Window: " + url + "(" + title + ")");

    // Close any windows that may already be open
    try {
        windowsCollection.window("window").close();
    } catch (e) { }

    // Create Window
    var windowObj = windowsCollection.createWindow("window", 100, 0, width, height);
    windowObj.setText(title);
    windowObj.center();
    if (allowResize) {
        windowObj.allowResize();
    }
    else {
        windowObj.denyResize();
    }
    windowObj.setModal(true);
    windowObj.progressOn();

    windowObj.button("park").hide();
    windowObj.button("park").disable();

    if (allowResize) {
        windowObj.button("minmax").show();
    }
    else {
        windowObj.button("minmax").hide();
    }

    if (hideCloseButton) {
        windowObj.button("close").hide();
        windowObj.button("close").disable();
    }

    windowObj.button("help").hide();
    windowObj.button("help").disable();

    windowObj.attachURL(url);
    windowObj.attachEvent("onContentLoaded", function (winObj) {
        winObj.progressOff();
    });
    windowObj.show();
}
function CloseWindow() {
    console.log("Call to close any open window");

    try {
        windowsCollection.window("window").close();
    } catch (e) { }
}
function WindowProgressOn() {
    try {
        windowsCollection.window("window").progressOn();
    } catch (e) { }

}
function WindowProgressOff() {
    try {
        windowsCollection.window("window").progressOff();
    } catch (e) { }
}

// Alert Window
// ============
function Alert(messageStr, TitleStr, onOk) {
    if (confirmObj != null) {
        confirmObj.close();
        confirmObj = null;
    }
    if (promptObj != null) {
        promptObj.close();
        promptObj = null;
    }
    if (alertObj != null) {
        console.error("Alert not null, while Alert called: " + TitleStr + ", saying:" + messageStr);
        return;
    }
    else {
        console.log("Alert called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    alertObj = messagingCollection.createWindow("alert", 0, 0, 300, 300);
    alertObj.setText(TitleStr);
    alertObj.center();
    alertObj.denyResize();
    alertObj.setModal(true);

    alertObj.button("park").hide();
    alertObj.button("park").disable();

    alertObj.button("minmax").hide();
    alertObj.button("minmax").disable();

    alertObj.button("close").hide();
    alertObj.button("close").disable();

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=AllertMessageText>" + messageStr + "</div>";
    html += "<div class=UiButtonBar><button id=AlertOkButton style=\"width:80px\">{{%word.ok%}}</button></div>";
    html += "</div>"
    alertObj.attachHTMLString(html);
    var offsetTextHeight = $('#AllertMessageText').outerHeight();

    $("#AlertOkButton").click(function () {
        console.log("Alert OK clicked");
        if (onOk) onOk();
        alertObj.close();
        alertObj = null;
    });

    alertObj.setDimension(300, offsetTextHeight + 100);
    alertObj.show();

    $("#AlertOkButton").focus();
}

// Confirm Window
// ==============
function Confirm(messageStr, TitleStr, onOk, onCancel) {
    if (alertObj != null) {
        alertObj.close();
        alertObj = null;
    }
    if (promptObj != null) {
        promptObj.close();
        promptObj = null;
    }
    if (confirmObj != null) {
        console.error("Confirm not null, while Confrim called with Title: " + TitleStr + ", saying: " + messageStr);
        return;
    }
    else {
        console.log("Confirm called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    confirmObj = messagingCollection.createWindow("confirm", 0, 0, 300, 300);
    confirmObj.setText(TitleStr);
    confirmObj.center();
    confirmObj.denyResize();
    confirmObj.setModal(true);

    confirmObj.button("park").hide();
    confirmObj.button("park").disable();

    confirmObj.button("minmax").hide();
    confirmObj.button("minmax").disable();

    confirmObj.button("close").hide();
    confirmObj.button("close").disable();

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=ConfrimMessageText>" + messageStr + "</div>";
    html += "<div class=UiButtonBar><button id=ConfirmOkButton style=\"width:80px\">OK</button><button id=ConfrimCancelButton style=\"width:80px\">Cancel</button></div>";
    html += "</div>";
    confirmObj.attachHTMLString(html);
    var offsetTextHeight = $('#ConfrimMessageText').outerHeight();

    $("#ConfirmOkButton").click(function () {
        console.log("Confrim OK clicked");
        if (onOk) onOk();
        confirmObj.close();
        confirmObj = null;
    });
    $("#ConfirmOkButton").click(function () {
        console.log("Confirm Cancel clicked");
        if (onCancel) onCancel();
        confirmObj.close();
        confirmObj = null;

    });

    confirmObj.setDimension(300, offsetTextHeight + 100);
    confirmObj.show();

    $("#ConfrimOkButton").focus();
}

// Promt Window
// ============
function Prompt(messageStr, TitleStr, FieldText, defaultValue, dataType, placeholderText, onOk, onCancel) {
    if (alertObj != null) {
        alertObj.close();
        alertObj = null;
    }
    if (confirmObj != null) {
        confirmObj.close();
        confirmObj = null;
    }
    if (promptObj != null) {
        console.error("Prompt not null, while Prompt called with Title: " + TitleStr + ", saying: " + messageStr);
        return;
    }
    else {
        console.log("Prompt called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    promptObj = messagingCollection.createWindow("prompt", 0, 0, 350, 350);
    promptObj.setText(TitleStr);
    promptObj.center();
    promptObj.denyResize();
    promptObj.setModal(true);

    promptObj.button("park").hide();
    promptObj.button("park").disable();

    promptObj.button("minmax").hide();
    promptObj.button("minmax").disable();

    promptObj.button("close").hide();
    promptObj.button("close").disable();

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=PromptMessageText>";
    html += messageStr;
    html += "<div style=\"margin-top:10px\">" + FieldText + " : </div>";
    html += "<div style=\"margin-top:5px\"><INPUT id=PromptValueField type=" + dataType + " value=\"" + defaultValue + "\" placeholder=\"" + placeholderText + "\" style=\"width:98%\"></div>"
    html += "</div>";
    html += "<div class=UiButtonBar><button id=PromptOkButton style=\"width:80px\">OK</button>&nbsp;<button id=PromptCancelButton class=UiButton style=\"width:80px\">Cancel</button></div>";
    html += "</div>";
    promptObj.attachHTMLString(html);
    var offsetTextHeight = $('#PromptMessageText').outerHeight();

    $("#PromptOkButton").click(function () {
        console.log("Prompt OK clicked, with value: " + $("#PromptValueField").val());
        if (onOk) onOk($("#PromptValueField").val());
        promptObj.close();
        promptObj = null;
    });

    $("#PromptCancelButton").click(function () {
        console.log("Prompt Cancel clicked");
        if (onCancel) onCancel();
        promptObj.close();
        promptObj = null;
    });

    promptObj.setDimension(350, offsetTextHeight + 100);
    promptObj.show();

    $("#PromptOkButton").focus();
}


// Notification Handling
// =====================
Notification.requestPermission();


// =================================================================================

// 4:3
var qvgaConstraints = {
    video: { width: { exact: 320 }, height: { exact: 240 }, aspectRatio: 1.33 }
};
var vgaConstraints = {
    video: { width: { exact: 640 }, height: { exact: 480 }, aspectRatio: 1.33 }
};

// 16:9
var qhdConstraints = {
    video: { width: { exact: 640 }, height: { exact: 360 }, aspectRatio: 1.77 }
};
var nhdConstraints = {
    video: { width: { exact: 960 }, height: { exact: 540 }, aspectRatio: 1.77 }
};
var hdConstraints = {
    video: { width: { exact: 1280 }, height: { exact: 720 }, aspectRatio: 1.77 }
};

// Screen share
var ssConstraints = {
    video: {
        mandatory: {
            chromeMediaSource: 'screen',
            // chromeMediaSource: 'desktop',
            maxWidth: screen.with,
            maxHeight: screen.height
        }
    }
};
