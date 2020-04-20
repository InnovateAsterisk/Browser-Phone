/*

====================
 ☎️ Raspberry Phone ☎️ 
 [A fully featured browser based SIP phone for Asterisk]
-------------------------------------------------------------
 Copyright (c) 2020  - Conrad de Wet - All Rights Reserved.
=============================================================

File: phone.js
License: GNU Lesser General Public License v3.0
Version: 0.0.1
Owner: Conrad De Wet
Date: April 2020
Git: https://github.com/InnovateAsterisk/Browser-Phone

=========
Requires:
=========
    ✅ sip-0.11.6.js
    ✅ jquery-3.3.1.min.js
    ✅ jquery.md5-min.js
    ✅ Chart.bundle-2.7.2.js
    ✅ dhtmlx.js
    ✅ fabric-2.4.6.min.js
    ✅ moment-with-locales-2.24.0.min.js
    ✅ croppie.min.js

===============
Features to do:
===============
    ✅ Call Recording
    ✅ Transfer Call
    ✅ Volume Adjust (track.enabled mute/unmute)
    ✅ Send: File, Image, Video, YouTube, Audio
    ✅ Send Text, Image, Recordong, Video, SMS, Email
    ✅ Group Handling / Conference / Monitoring

========================================================
*/

var userAgentStr = "Raspberry Phone (SipJS - 0.11.6)";
var hostingPrefex = "";

// =====================================================

// Local Storage
var localDB = window.localStorage;

var userAgent = null;

var CallSessions = new Array();
var PreviousSessions = new Array();

var voicemailSubs = null;
var BlfSubs = new Array();
var RemoteAudioMeters = new Array();
var LocalAudioMeters = new Array();
var CanvasCollection = new Array();
var Buddies = new Array();
var isReRegister = false;
var dhtmlxPopup = null;
var selectedBuddy = null;

var alertObj = null;
var confirmObj = null;
var promptObj = null;

var windowsCollection = null;
var messagingCollection = null;

// User Settings & Defaults
// ========================
var wssServer = localDB.getItem("wssServer");           // eg: raspberrypi.local
var profileUserID = localDB.getItem("profileUserID");   // eg: 8D68B3EFEC8D0F5
var profileUser = localDB.getItem("profileUser");       // eg: 100
var profileName = localDB.getItem("profileName");       // eg: Keyla James
var WebSocketPort = localDB.getItem("WebSocketPort");   // eg: 444 | 4443
var ServerPath = localDB.getItem("ServerPath");         // eg: /ws
var SipUsername = localDB.getItem("SipUsername");       // eg: webrtc
var SipPassword = localDB.getItem("SipPassword");       // eg: webrtc

var AutoAnswerEnabled = (getDbItem("AutoAnswerEnabled", "0") == "1");
var DoNotDisturbEnabled = (getDbItem("DoNotDisturbEnabled", "0") == "1");
var CallWaitingEnabled = (getDbItem("CallWaitingEnabled", "1") == "1");

var AutoGainControl = (getDbItem("AutoGainControl", "1") == "1");
var EchoCancellation = (getDbItem("EchoCancellation", "1") == "1");
var NoiseSuppression = (getDbItem("NoiseSuppression", "1") == "1");
var MirrorVideo = getDbItem("VideoOrientation", "rotateY(180deg)");
var maxFrameRate = getDbItem("FrameRate", "");
var videoHeight = getDbItem("VideoHeight", "");
var videoAspectRatio = getDbItem("AspectRatio", "");
var NotificationsActive = (getDbItem("Notifications", "0") == "1");

// Utilities
// =========
function uniqueId() {
    return "id-" + Math.random().toString(36).substr(2, 16).toUpperCase();
}
function uID(){
    return Date.now().toString(16).toUpperCase();
}
function utcDateNow(){
    return moment().utc().format("YYYY-MM-DD HH:mm:ss") +" UTC";
}
function getDbItem(itemIndex, defaultValue){
    if(localDB.getItem(itemIndex) != null) return localDB.getItem(itemIndex);
    return defaultValue;
}
var getAudioSrcID = function(){
    var id = localDB.getItem("AudioSrcId");
    return (id != null)? id : "default";
}
var getAudioOutputID = function(){
    var id = localDB.getItem("AudioOutputId");
    return (id != null)? id : "default";    
}
var getVideoSrcID = function(){
    var id = localDB.getItem("VideoSrcId");
    return (id != null)? id : "default";    
}

// Window and Document Events
// ==========================
window.onbeforeunload = function () {
    Unregister();
    return null;
}
$(window).on('resize', function () {
    UpdateUI();
});

// User Interface
// ==============
function UpdateUI(){
    var windowWidth = $(window).outerWidth();
    if(windowWidth < 920){
        console.log("Narrow Layout")

        if(selectedBuddy == null)
        {
            // Nobody Selected
            $("#rightContent").hide();

            $("#leftContent").css("width", "100%");
            $("#leftContent").show();
        } else {
            $("#rightContent").css("margin-left", "0px");
            $("#rightContent").show();

            $("#leftContent").hide();
        }
    } else {
        console.log("Widescreen Layout")

        if(selectedBuddy == null)
        {
            $("#leftContent").css("width", "100%");
            $("#rightContent").css("margin-left", "0px");
            $("#leftContent").show();
            $("#rightContent").hide();
        }
        else{
            $("#leftContent").css("width", "320px");
            $("#rightContent").css("margin-left", "320px");
            $("#leftContent").show();
            $("#rightContent").show();
        }

    }
}

// UI Windows
// ==========
function AddSomeoneWindow(){
    try{
        dhtmlxPopup.hide();
    } catch(e){}

    var html = "<div border=0 class='UiWindowField scroller'>";

    html += "<div class=UiText>Full Name:</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='eg: Keyla James'></div>";

    html += "<div class=UiText>Title / Description:</div>";
    html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='eg: General Manager'></div>";

    html += "<div class=UiText>Subscribe Extension (Internal):</div>";
    html += "<div><input id=AddSomeone_Exten class=UiInputText type=text placeholder='eg: 100 or john'></div>";

    html += "<div class=UiText>Mobile Number:</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=text placeholder='eg: +44 123-456 7890'></div>";

    html += "<div class=UiText>Email:</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=text placeholder='eg: Keyla.James@raspberrypi.org'></div>";

    html += "<div class=UiText>Contact Number 1:</div>";
    html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='eg: +1 234 567 8901'></div>";

    html += "<div class=UiText>Contact Number 2:</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='eg: +441234567890'></div>";
    html += "</div>"
    OpenWindow(html, "Add Someone", 480, 640, false, true, "Add", function(){

        // Add Contact / Extension
        var json = JSON.parse(localDB.getItem("UserBuddiesJson"));
        if(json == null) json = InitUserBuddies();

        if($("#AddSomeone_Exten").val() == ""){
            // Add Regular Contact
            var id = cID();
            var dateNow = utcDateNow();
            json.DataCollection.push(
                {
                    Type: "contact", 
                    LastActivity: dateNow,
                    ExtensionNumber: "", 
                    MobileNumber: $("#AddSomeone_Mobile").val(),
                    ContactNumber1: $("#AddSomeone_Num1").val(),
                    ContactNumber2: $("#AddSomeone_Num2").val(),
                    uID: null,
                    cID: id,
                    gID: null,
                    DisplayName: $("#AddSomeone_Name").val(),
                    Position: "",
                    Description: $("#AddSomeone_Desc").val(),
                    Email: $("#AddSomeone_Email").val(),
                    MemberCount: 0
                }
            );
            var buddy = new Buddy("contact", id, $("#AddSomeone_Name").val(), "", $("#AddSomeone_Mobile").val(), $("#AddSomeone_Num1").val(), $("#AddSomeone_Num2").val(), dateNow, $("#AddSomeone_Desc").val(), $("#AddSomeone_Email").val());
            AddBuddy(buddy, false, false);
        } else {
            // Add Extension
            var id = uID();
            var dateNow = utcDateNow();
            json.DataCollection.push(
                {
                    Type: "extension",
                    LastActivity: dateNow,
                    ExtensionNumber: $("#AddSomeone_Exten").val(),
                    MobileNumber: $("#AddSomeone_Mobile").val(),
                    ContactNumber1: $("#AddSomeone_Num1").val(),
                    ContactNumber2: $("#AddSomeone_Num2").val(),
                    uID: id,
                    cID: null,
                    gID: null,
                    DisplayName: $("#AddSomeone_Name").val(),
                    Position: $("#AddSomeone_Desc").val(),
                    Description: "", 
                    Email: $("#AddSomeone_Email").val(),
                    MemberCount: 0
                }
            );
            var buddy = new Buddy("extension", id, $("#AddSomeone_Name").val(), $("#AddSomeone_Exten").val(), $("#AddSomeone_Mobile").val(), $("#AddSomeone_Num1").val(), $("#AddSomeone_Num2").val(), dateNow, $("#AddSomeone_Desc").val(), $("#AddSomeone_Email").val());
            AddBuddy(buddy, false, false);
        }
        // Update Size: 
        json.TotalRows = json.DataCollection.length;

        // Save To DB
        localDB.setItem("UserBuddiesJson", JSON.stringify(json));

        UpdateBuddyList();

        CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    });
}
function CreateGroupWindow(){
    OpenWindow("", "Create Group", 480, 640, false, true, null, function(){

        // Create Group

        CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    })
}
function ConfigureExtensionWindow(){
    try{
        dhtmlxPopup.hide();
    } catch(e){}

    OpenWindow("...", "Configure Extension", 480, 640, false, true, "Save", function(){

        // 1 Account
        if(localDB.getItem("profileUserID") == null) localDB.setItem("profileUserID", uID()); // For first time only
        localDB.setItem("wssServer", $("#Configure_Account_wssServer").val());
        localDB.setItem("WebSocketPort", $("#Configure_Account_WebSocketPort").val());
        localDB.setItem("ServerPath", $("#Configure_Account_ServerPath").val());
        localDB.setItem("profileUser", $("#Configure_Account_profileUser").val());
        localDB.setItem("profileName", $("#Configure_Account_profileName").val());
        localDB.setItem("SipUsername", $("#Configure_Account_SipUsername").val());
        localDB.setItem("SipPassword", $("#Configure_Account_SipPassword").val());
        getVideoSrcID();

        // 2 Audio & Video
        localDB.setItem("AudioOutputId", $("#playbackSrc").val());
        localDB.setItem("VideoSrcId", $("#previewVideoSrc").val());
        localDB.setItem("VideoHeight", $("input[name=Settings_Quality]:checked").val());
        localDB.setItem("FrameRate", $("input[name=Settings_FrameRate]:checked").val());
        localDB.setItem("AspectRatio", $("input[name=Settings_AspectRatio]:checked").val());
        localDB.setItem("VideoOrientation", $("input[name=Settings_Oriteation]:checked").val());
        localDB.setItem("AudioSrcId", $("#microphoneSrc").val());
        localDB.setItem("AutoGainControl", ($("#Settings_AutoGainControl").is(':checked'))? "1" : "0");
        localDB.setItem("EchoCancellation", ($("#Settings_EchoCancellation").is(':checked'))? "1" : "0");
        localDB.setItem("NoiseSuppression", ($("#Settings_NoiseSuppression").is(':checked'))? "1" : "0");
        localDB.setItem("RingOutputId", $("#ringDevice").val());

        // 3 Appearance
        $("#ImageCanvas").croppie('result', { 
            type: 'base64', 
            size: 'viewport', 
            format: 'png', 
            quality: 1, 
            circle: false 
        }).then(function(base64) {
            localDB.setItem("profilePicture", base64);
        });

        // 4 Notifications
        localDB.setItem("Notifications", ($("#Settings_Notifications").is(":checked"))? "1" : "0");

        Alert("In order to apply these settings, the page must reload, OK?", "Reload Required", function(){
            window.location.reload();
        });

        // CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    }, function(){
        // DoOnLoad
    },function(){
        // OnClose

        var localVideo = $("#local-video-preview").get(0);
        try{
            var tracks = localVideo.srcObject.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
            localVideo.srcObject = null;
        } catch(e){}

        try{
            var tracks = window.SettingsMicrophoneStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        } catch(e){}
        window.SettingsMicrophoneStream = null;

        try{
            var soundMeter = window.SettingsMicrophoneSoundMeter;
            soundMeter.stop();
        } catch(e){}   
        window.SettingsMicrophoneSoundMeter = null;
        
        try{
            window.SettingsOutputAudio.pause();
        } catch(e){}
        window.SettingsOutputAudio = null;

        try{
            var tracks = window.SettingsOutputStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        } catch(e){}
        window.SettingsOutputStream = null;

        try{
            var soundMeter = window.SettingsOutputStreamMeter;
            soundMeter.stop();
        } catch(e){}
        window.SettingsOutputStreamMeter = null;

        return true;
    });

    // Write HTML to Tabs
    var windowObj = windowsCollection.window("window");
    var ConfigureTabbar = windowObj.attachTabbar({ tabs: 
        [
            { id: "1", text: "Account", active:  true },
            { id: "2", text: "Audio & Video", active:  false },
            { id: "3", text: "Appearance", active:  false },
            { id: "4", text: "Notifications", active:  false },
            { id: "5", text: "Language", active:  false },
        ]
    });

    // 1 Account 
    // ==================================================================================
    var AccountHtml =  "<div class=\"UiWindowField scroller\">";
    AccountHtml += "<div class=UiText>Asterisk Server Address:</div>";
    AccountHtml += "<div><input id=Configure_Account_wssServer class=UiInputText type=text placeholder='eg: 192.168.1.1 or raspberrypi.local' value='"+ getDbItem("wssServer", "") +"'></div>";

    AccountHtml += "<div class=UiText>WebSocket Port:</div>";
    AccountHtml += "<div><input id=Configure_Account_WebSocketPort class=UiInputText type=text placeholder='eg: 4443' value='"+ getDbItem("WebSocketPort", "") +"'></div>";

    AccountHtml += "<div class=UiText>WebSocket Path:</div>";
    AccountHtml += "<div><input id=Configure_Account_ServerPath class=UiInputText type=text placeholder='eg: /ws' value='"+ getDbItem("ServerPath", "") +"'></div>";

    AccountHtml += "<div class=UiText>Subscribe Extension (Internal):</div>";
    AccountHtml += "<div><input id=Configure_Account_profileUser class=UiInputText type=text placeholder='eg: john or 100' value='"+ getDbItem("profileUser", "") +"'></div>";

    AccountHtml += "<div class=UiText>Full Name:</div>";
    AccountHtml += "<div><input id=Configure_Account_profileName class=UiInputText type=text placeholder='eg: Keyla James' value='"+ getDbItem("profileName", "") +"'></div>";

    AccountHtml += "<div class=UiText>SIP Username:</div>";
    AccountHtml += "<div><input id=Configure_Account_SipUsername class=UiInputText type=text placeholder='eg: webrtc' value='"+ getDbItem("SipUsername", "") +"'></div>";

    AccountHtml += "<div class=UiText>SIP Password:</div>";
    AccountHtml += "<div><input id=Configure_Account_SipPassword class=UiInputText type=password placeholder='eg: 1234' value='"+ getDbItem("SipPassword", "") +"'></div>";
    AccountHtml += "<br><br></div>";

    ConfigureTabbar.tabs("1").attachHTMLString(AccountHtml);

    // 2 Audio & Video
    // ==================================================================================
    var AudioVideoHtml = "<div class=\"UiWindowField scroller\">";

    AudioVideoHtml += "<div class=UiText>Speaker:</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=playbackSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_SpeakerOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><button class=on_white id=preview_output_play><i class=\"fa fa-play\"></i></button></div>";

    AudioVideoHtml += "<div class=UiText>Microphone:</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=microphoneSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_MicrophoneOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_AutoGainControl><label for=Settings_AutoGainControl> Auto Gain Control<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_EchoCancellation><label for=Settings_EchoCancellation> Echo Cancellation<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_NoiseSuppression><label for=Settings_NoiseSuppression> Noise Suppression<label></div>";

    AudioVideoHtml += "<div class=UiText>Camera:</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=previewVideoSrc style=\"width:100%\"></select></div>";

    AudioVideoHtml += "<div class=UiText>Frame Rate (per second):</div>"
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r40 type=radio value=\"2\"><label class=radio_pill for=r40>2</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r41 type=radio value=\"5\"><label class=radio_pill for=r41>5</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r42 type=radio value=\"10\"><label class=radio_pill for=r42>10</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r43 type=radio value=\"15\"><label class=radio_pill for=r43>15</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r44 type=radio value=\"20\"><label class=radio_pill for=r44>20</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r45 type=radio value=\"25\"><label class=radio_pill for=r45>25</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r46 type=radio value=\"30\"><label class=radio_pill for=r46>30</label>";
    AudioVideoHtml += "<input name=Settings_FrameRate id=r47 type=radio value=\"\"><label class=radio_pill for=r47><i class=\"fa fa-trash\"></i></label>";
    AudioVideoHtml += "</div>";

    AudioVideoHtml += "<div class=UiText>Quality:</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_Quality id=r30 type=radio value=\"160\"><label class=radio_pill for=r30><i class=\"fa fa-video-camera\" style=\"transform: scale(0.4)\"></i> HQVGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r31 type=radio value=\"240\"><label class=radio_pill for=r31><i class=\"fa fa-video-camera\" style=\"transform: scale(0.6)\"></i> QVGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r32 type=radio value=\"480\"><label class=radio_pill for=r32><i class=\"fa fa-video-camera\" style=\"transform: scale(0.8)\"></i> VGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r33 type=radio value=\"720\"><label class=radio_pill for=r33><i class=\"fa fa-video-camera\" style=\"transform: scale(1)\"></i> HD</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r34 type=radio value=\"\"><label class=radio_pill for=r34><i class=\"fa fa-trash\"></i></label>";
    AudioVideoHtml += "</div>";
    
    AudioVideoHtml += "<div class=UiText>Image Oriteation:</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_Oriteation id=r20 type=radio value=\"rotateY(0deg)\"><label class=radio_pill for=r20><i class=\"fa fa-address-card\" style=\"transform: rotateY(0deg)\"></i> Normal</label>";
    AudioVideoHtml += "<input name=Settings_Oriteation id=r21 type=radio value=\"rotateY(180deg)\"><label class=radio_pill for=r21><i class=\"fa fa-address-card\" style=\"transform: rotateY(180deg)\"></i> Mirror</label>";
    AudioVideoHtml += "</div>";

    AudioVideoHtml += "<div class=UiText>Aspect Ratio:</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r10 type=radio value=\"1\"><label class=radio_pill for=r10><i class=\"fa fa-square-o\" style=\"transform: scaleX(1); margin-left: 7px; margin-right: 7px\"></i> 1:1</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r11 type=radio value=\"1.33\"><label class=radio_pill for=r11><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.33); margin-left: 5px; margin-right: 5px;\"></i> 4:3</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r12 type=radio value=\"1.77\"><label class=radio_pill for=r12><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.77); margin-right: 3px;\"></i> 16:9</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r13 type=radio value=\"\"><label class=radio_pill for=r13><i class=\"fa fa-trash\"></i></label>";
    AudioVideoHtml += "</div>";
    
    AudioVideoHtml += "<div class=UiText>Preview:</div>";
    AudioVideoHtml += "<div style=\"text-align:center; margin-top:10px\"><video id=local-video-preview class=previewVideo></video></div>";

    // TODO
    // AudioVideoHtml += "<div class=UiText>Ringtone:</div>";
    // AudioVideoHtml += "<div style=\"text-align:center\"><select id=ringTone style=\"width:100%\"></select></div>";
    // AudioVideoHtml += "<div>Play</div>";

    AudioVideoHtml += "<div id=RingDeviceSection>";
    AudioVideoHtml += "<div class=UiText>Ring Device:</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=ringDevice style=\"width:100%\"></select></div>";
    AudioVideoHtml += "</div>";
    
    AudioVideoHtml += "<BR><BR></div>";

    ConfigureTabbar.tabs("2").attachHTMLString(AudioVideoHtml);

    // Output
    var selectAudioScr = $("#playbackSrc");

    var playButton = $("#preview_output_play");

    // Microphone
    var selectMicScr = $("#microphoneSrc");
    $("#Settings_AutoGainControl").prop("checked", AutoGainControl);
    $("#Settings_EchoCancellation").prop("checked", EchoCancellation);
    $("#Settings_NoiseSuppression").prop("checked", NoiseSuppression);
    
    // Webcam
    var selectVideoScr = $("#previewVideoSrc");

    // Orientation
    var OriteationSel = $("input[name=Settings_Oriteation]");
    OriteationSel.each(function(){
        if(this.value == MirrorVideo) $(this).prop("checked", true);
    });
    $("#local-video-preview").css("transform", MirrorVideo);

    // Frame Rate
    var frameRateSel = $("input[name=Settings_FrameRate]");
    frameRateSel.each(function(){
        if(this.value == maxFrameRate) $(this).prop("checked", true);
    });

    // Quality
    var QualitySel = $("input[name=Settings_Quality]");
    QualitySel.each(function(){
        if(this.value == videoHeight) $(this).prop("checked", true);
    });    

    // Aspect Ratio
    var AspectRatioSel = $("input[name=Settings_AspectRatio]");
    AspectRatioSel.each(function(){
        if(this.value == videoAspectRatio) $(this).prop("checked", true);
    });    

    // Ring Tone
    var selectRingTone = $("#ringTone");
    // TODO

    // Ring Device
    var selectRingDevice = $("#ringDevice");
    // TODO

    // Handle Aspect Ratio Change
    AspectRatioSel.change(function(){    
        console.log("Call to change Aspect Ratio ("+ this.value +")");

        var localVideo = $("#local-video-preview").get(0);
        localVideo.muted = true;
        localVideo.playsinline = true;
        localVideo.autoplay = true;

        var tracks = localVideo.srcObject.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });

        var constraints = {
            audio: false,
            video: {
                deviceId: (selectVideoScr.val() != "default")? { exact: selectVideoScr.val() } : "default"
            }
        }
        if($("input[name=Settings_FrameRate]:checked").val() != ""){
            constraints.video.frameRate = $("input[name=Settings_FrameRate]:checked").val();
        }
        if($("input[name=Settings_Quality]:checked").val() != ""){
            constraints.video.height = $("input[name=Settings_Quality]:checked").val();
        }
        if(this.value != ""){
            constraints.video.aspectRatio = this.value;
        }        
        console.log("Constraints:", constraints);
        var localStream = new MediaStream();
        if(navigator.mediaDevices){
            navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
                var videoTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(videoTrack);
                localVideo.srcObject = localStream;
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
            }).catch(function(e){
                console.error(e);
                Alert("Error getting User Media.", "Error");
            });
        }
    });

    // Handle Video Height Change
    QualitySel.change(function(){    
        console.log("Call to change Video Height ("+ this.value +")");

        var localVideo = $("#local-video-preview").get(0);
        localVideo.muted = true;
        localVideo.playsinline = true;
        localVideo.autoplay = true;

        var tracks = localVideo.srcObject.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });

        var constraints = {
            audio: false,
            video: {
                deviceId: (selectVideoScr.val() != "default")? { exact: selectVideoScr.val() } : "default" ,
            }
        }
        if($("input[name=Settings_FrameRate]:checked").val() != ""){
            constraints.video.frameRate = $("input[name=Settings_FrameRate]:checked").val();
        }
        if(this.value){
            constraints.video.height = this.value;
        }
        if($("input[name=Settings_AspectRatio]:checked").val() != ""){
            constraints.video.aspectRatio = $("input[name=Settings_AspectRatio]:checked").val();
        } 
        console.log("Constraints:", constraints);
        var localStream = new MediaStream();
        if(navigator.mediaDevices){
            navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
                var videoTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(videoTrack);
                localVideo.srcObject = localStream;
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
            }).catch(function(e){
                console.error(e);
                Alert("Error getting User Media.", "Error");
            });
        }
    });    

    // Handle Frame Rate Change 
    frameRateSel.change(function(){
        console.log("Call to change Frame Rate ("+ this.value +")");

        var localVideo = $("#local-video-preview").get(0);
        localVideo.muted = true;
        localVideo.playsinline = true;
        localVideo.autoplay = true;

        var tracks = localVideo.srcObject.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });

        var constraints = {
            audio: false,
            video: {
                deviceId: (selectVideoScr.val() != "default")? { exact: selectVideoScr.val() } : "default" ,
            }
        }
        if(this.value != ""){
            constraints.video.frameRate = this.value;
        }
        if($("input[name=Settings_Quality]:checked").val() != ""){
            constraints.video.height = $("input[name=Settings_Quality]:checked").val();
        }
        if($("input[name=Settings_AspectRatio]:checked").val() != ""){
            constraints.video.aspectRatio = $("input[name=Settings_AspectRatio]:checked").val();
        } 
        console.log("Constraints:", constraints);
        var localStream = new MediaStream();
        if(navigator.mediaDevices){
            navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
                var videoTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(videoTrack);
                localVideo.srcObject = localStream;
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
            }).catch(function(e){
                console.error(e);
                Alert("Error getting User Media.", "Error");
            });
        }
    });

    // Handle Audio Source changes (Microphone)
    selectMicScr.change(function(){
        console.log("Call to change Microphone ("+ this.value +")");

        // Change and update visual preview
        try{
            var tracks = window.SettingsMicrophoneStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
            window.SettingsMicrophoneStream = null;
        } catch(e){}

        try{
            soundMeter = window.SettingsMicrophoneSoundMeter;
            soundMeter.stop();
            window.SettingsMicrophoneSoundMeter = null;
        } catch(e){}

        // Get Microphone
        var constraints = { 
            audio: {
                deviceId: { exact: this.value }
            }, 
            video: false 
        }
        var localMicrophoneStream = new MediaStream();
        navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream){
            var audioTrack = mediaStream.getAudioTracks()[0];
            if(audioTrack != null){
                // Display Micrphone Levels
                localMicrophoneStream.addTrack(audioTrack);
                window.SettingsMicrophoneStream = localMicrophoneStream;
                window.SettingsMicrophoneSoundMeter = MeterSettingsOutput(localMicrophoneStream, "Settings_MicrophoneOutput", "width", 50);
            }
        }).catch(function(e){
            console.log("Failed to getUserMedia", e);
        });
    });

    // Handle output change (speaker)
    selectAudioScr.change(function(){
        console.log("Call to change Speaker ("+ this.value +")");

        var audioObj = window.SettingsOutputAudio;
        if(audioObj != null) {
            if (typeof audioObj.sinkId !== 'undefined') {
                audioObj.setSinkId(this.value).then(function() {
                    // User must click play
                }).catch(function(e){
                    console.log("Failed not apply setSinkId.", e);
                });
            }
        }
    });

    // play button press
    playButton.click(function(){

        try{
            window.SettingsOutputAudio.pause();
        } catch(e){}
        window.SettingsOutputAudio = null;

        try{
            var tracks = window.SettingsOutputStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        } catch(e){}
        window.SettingsOutputStream = null;

        try{
            var soundMeter = window.SettingsOutputStreamMeter;
            soundMeter.stop();
        } catch(e){}
        window.SettingsOutputStreamMeter = null;

        // Load Sample
        var audioObj = new Audio(hostingPrefex + "/speech_orig.mp3"); //speech_orig.wav: this file failes to play using the Asteriks MiniServer
        audioObj.onplay = function(){
            var outputStream = new MediaStream();
            if (typeof audioObj.captureStream !== 'undefined') {
                outputStream = audioObj.captureStream();
            } else if (typeof audioObj.mozCaptureStream !== 'undefined') {
                return;
                // BUG: mozCaptureStream() in Firefox does not work the same way as captureStream()
                // the actual sound does not play out to the speakers... its as if the mozCaptureStream
                // removes the stream from the <audio> object.
                outputStream = audioObj.mozCaptureStream();
            } else if (typeof audioObj.webkitCaptureStream !== 'undefined') {
                outputStream = audioObj.webkitCaptureStream();
            } else {
                console.log("Cannot display Audio Levels")
                return;
            }
            // Monitor Output
            window.SettingsOutputStream = outputStream;
            window.SettingsOutputStreamMeter = MeterSettingsOutput(outputStream, "Settings_SpeakerOutput", "width", 50);
        }
        audioObj.oncanplaythrough = function(e) {
            if (typeof audioObj.sinkId !== 'undefined') {
                audioObj.setSinkId(selectAudioScr.val()).then(function() {
                    console.log("Set sinkId to:", selectAudioScr.val());
                }).catch(function(e){
                    console.log("Failed not apply setSinkId.", e);
                });
            }
            // Play
            audioObj.play();
            console.log("Playing sample audio file... ");
        }

        window.SettingsOutputAudio = audioObj;
    });

    // Change Video Image
    OriteationSel.change(function(){
        console.log("Call to change Orientation ("+ this.value +")");
        $("#local-video-preview").css("transform", this.value);
    });

    // Handle video input change (WebCam)
    selectVideoScr.change(function(){
        console.log("Call to change WebCam ("+ this.value +")");

        var localVideo = $("#local-video-preview").get(0);
        localVideo.muted = true;
        localVideo.playsinline = true;
        localVideo.autoplay = true;

        var tracks = localVideo.srcObject.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });

        var constraints = {
            audio: false,
            video: {
                deviceId: (this.value != "default")? { exact: this.value } : "default"
            }
        }
        if($("input[name=Settings_FrameRate]:checked").val() != ""){
            constraints.video.frameRate = $("input[name=Settings_FrameRate]:checked").val();
        }
        if($("input[name=Settings_Quality]:checked").val() != ""){
            constraints.video.height = $("input[name=Settings_Quality]:checked").val();
        }
        if($("input[name=Settings_AspectRatio]:checked").val() != ""){
            constraints.video.aspectRatio = $("input[name=Settings_AspectRatio]:checked").val();
        } 
        console.log("Constraints:", constraints);
        var localStream = new MediaStream();
        if(navigator.mediaDevices){
            navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
                var videoTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(videoTrack);
                localVideo.srcObject = localStream;
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
            }).catch(function(e){
                console.error(e);
                Alert("Error getting User Media.", "Error");
            });
        }
    });

    // Note: Only works over HTTPS or via localhost!!
    var localVideo = $("#local-video-preview").get(0);
    localVideo.muted = true;
    localVideo.playsinline = true;
    localVideo.autoplay = true;

    var localVideoStream = new MediaStream();
    var localMicrophoneStream = new MediaStream();
    
    if(navigator.mediaDevices){
        navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
            var savedVideoDevice = getVideoSrcID();
            var videoDeviceFound = false;

            var savedAudioDevice = getAudioSrcID();
            var audioDeviceFound = false;

            var MicrophoneFound = false;
            var SpeakerFound = false;
            var VideoFound = false;

            for (var i = 0; i < deviceInfos.length; ++i) {
                console.log("Found Device ("+ deviceInfos[i].kind +"): ", deviceInfos[i].label, );

                // Check Devices
                if (deviceInfos[i].kind === "audioinput") {
                    MicrophoneFound = true;
                    if(savedAudioDevice != "default" && deviceInfos[i].deviceId == savedAudioDevice) {
                        audioDeviceFound = true;
                    }                   
                } else if (deviceInfos[i].kind === "audiooutput") {
                    SpeakerFound = true;
                } else if (deviceInfos[i].kind === "videoinput") {
                    VideoFound = true;
                    if(savedVideoDevice != "default" && deviceInfos[i].deviceId == savedVideoDevice) {
                        videoDeviceFound = true;
                    }
                }
            }

            var contraints = {
                audio: MicrophoneFound,
                video: VideoFound
            }

            if(MicrophoneFound){
                contraints.audio = { deviceId: "default" };
                if(audioDeviceFound) contraints.audio.deviceId = { exact: savedAudioDevice };
            }
            if(VideoFound){
                contraints.video = { deviceId: "default" };
                if(videoDeviceFound) contraints.video.deviceId = { exact: savedVideoDevice };
            }
            // Additional
            if($("input[name=Settings_FrameRate]:checked").val() != ""){
                contraints.video.frameRate = $("input[name=Settings_FrameRate]:checked").val();
            }
            if($("input[name=Settings_Quality]:checked").val() != ""){
                contraints.video.height = $("input[name=Settings_Quality]:checked").val();
            }
            if($("input[name=Settings_AspectRatio]:checked").val() != ""){
                contraints.video.aspectRatio = $("input[name=Settings_AspectRatio]:checked").val();
            } 
            console.log("Get User Media", contraints);
            // Get User Media
            navigator.mediaDevices.getUserMedia(contraints).then(function(mediaStream){
                // Handle Video
                var videoTrack = (mediaStream.getVideoTracks().length >= 1)? mediaStream.getVideoTracks()[0] : null;
                if(VideoFound && videoTrack != null){
                    localVideoStream.addTrack(videoTrack);
                    // Display Preview Video
                    localVideo.srcObject = localVideoStream;
                    localVideo.onloadedmetadata = function(e) {
                        localVideo.play();
                    }
                } else {
                    Alert("No video / webcam devices found, make sure one is plugged in.", "Device Error");
                }

                // Handle Audio
                var audioTrack = (mediaStream.getAudioTracks().length >= 1)? mediaStream.getAudioTracks()[0] : null ;
                if(MicrophoneFound && audioTrack != null){
                    localMicrophoneStream.addTrack(audioTrack);
                    // Display Micrphone Levels
                    window.SettingsMicrophoneStream = localMicrophoneStream;
                    window.SettingsMicrophoneSoundMeter = MeterSettingsOutput(localMicrophoneStream, "Settings_MicrophoneOutput", "width", 50);
                } else {
                    Alert("No microphone devices found, make sure one is plugged in.", "Device Error");
                }

                // Display Output Levels
                $("#Settings_SpeakerOutput").css("width", "0%");
                if(!SpeakerFound){
                    console.log("No speaker devices found, make sure one is plugged in.")
                    $("#playbackSrc").hide();
                    $("#RingDeviceSection").hide();
                }

                // Return .then()
                return navigator.mediaDevices.enumerateDevices();
            }).then(function(deviceInfos){
                for (var i = 0; i < deviceInfos.length; ++i) {
                    console.log("Found Device ("+ deviceInfos[i].kind +") Again: ", deviceInfos[i].label, deviceInfos[i].deviceId);

                    var deviceInfo = deviceInfos[i];
                    var devideId = deviceInfo.deviceId;
                    var DisplayName = deviceInfo.label;
                    if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));

                    var option = $('<option/>');
                    option.prop("value", devideId);

                    if (deviceInfo.kind === "audioinput") {
                        option.text((DisplayName != "")? DisplayName : "Microphone");
                        if(getAudioSrcID() == devideId) option.prop("selected", true);
                        selectMicScr.append(option);
                    } else if (deviceInfo.kind === "audiooutput") {
                        option.text((DisplayName != "")? DisplayName : "Speaker");
                        if(getAudioOutputID() == devideId) option.prop("selected", true);
                        selectAudioScr.append(option);
                        selectRingDevice.append(option.clone());
                    } else if (deviceInfo.kind === "videoinput") {
                        if(getVideoSrcID() == devideId) option.prop("selected", true);
                        option.text((DisplayName != "")? DisplayName : "Webcam");
                        selectVideoScr.append(option);
                    }
                }
            }).catch(function(e){
                console.error("Error getting User Media.", e);
                Alert("Error getting User Media.", "Error");
            });
        }).catch(function(e){
            console.error("Error getting Media Devices", e);
        });
    } else {
        Alert("MediaDevices was null -  Check if your connection is secure (HTTPS)", "Error");
    }

    // 3 Appearance
    // ==================================================================================
    var AppearanceHtml = "<div class=\"UiWindowField scroller\">"; 
    AppearanceHtml += "<div id=ImageCanvas style=\"width:150px; height:150px\"></div>";
    AppearanceHtml += "<div style=\"float:left; margin-left:200px;\"><input id=fileUploader type=file></div>";
    AppearanceHtml += "<div style=\"margin-top: 50px\"></div>";
    AppearanceHtml += "<div>";

    ConfigureTabbar.tabs("3").attachHTMLString(AppearanceHtml);

    cropper = $("#ImageCanvas").croppie({
        viewport: { width: 150, height: 150, type: 'circle' }
    });

    // Preview Existing Image
    $("#ImageCanvas").croppie('bind', { url: getPicture("profilePicture") }).then();

    // Wireup File Change
    $("#fileUploader").change(function () {
        var filesArray = $(this).prop('files');
    
        if (filesArray.length == 1) {
            var uploadId = Math.floor(Math.random() * 1000000000);
            var fileObj = filesArray[0];
            var fileName = fileObj.name;
            var fileSize = fileObj.size;
    
            if (fileSize <= 52428800) {
                console.log("Adding (" + uploadId + "): " + fileName + " of size: " + fileSize + "bytes");
    
                var reader = new FileReader();
                reader.Name = fileName;
                reader.UploadId = uploadId;
                reader.Size = fileSize;
                reader.onload = function (event) {
                    $("#ImageCanvas").croppie('bind', {
                        url: event.target.result
                    });
                };
    
                // Use onload for this
                reader.readAsDataURL(fileObj);
            }
            else {
                Alert("The file '" + fileName + "' is bigger than 50MB, you cannot upload this file", "File Error");
            }
        } else {
            Alert("Select a single file", "File Error");
        }
    });

    // 4 Notifications
    // ==================================================================================
    var NotificationsHtml = "<div class=\"UiWindowField scroller\">";
    NotificationsHtml += "<div class=UiText>Notifications:</div>";
    NotificationsHtml += "<div><input type=checkbox id=Settings_Notifications><label for=Settings_Notifications> Enabled Onscreen Notifictions<label></div>";
    NotificationsHtml += "<div>";

    ConfigureTabbar.tabs("4").attachHTMLString(NotificationsHtml);

    var NotificationsCheck = $("#Settings_Notifications");
    NotificationsCheck.prop("checked", NotificationsActive);
    NotificationsCheck.change(function(){
        if(this.checked){
            if(Notification.permission != "granted"){
                if(checkNotificationPromise()){
                    Notification.requestPermission().then(function(p){
                        console.log(p);
                        HandleNotifyPermission(p);
                    });
                } else {
                    Notification.requestPermission(function(p){
                        console.log(p);
                        HandleNotifyPermission(p)
                    });
                }
            }
        }
    });

    // 5 Language
    // ==================================================================================
    // TODO
    var LanguageHtml = "<div class=\"UiWindowField scroller\">";
    LanguageHtml += "<div>TODO...</div>";
    LanguageHtml += "<div>";

    ConfigureTabbar.tabs("5").attachHTMLString(LanguageHtml);
}
function checkNotificationPromise() {
    try {
        Notification.requestPermission().then();
    } catch(e) {
        return false;
    }
    return true;
}
function HandleNotifyPermission(p){
    if(p == "granted") {
        // Good
    } else {
        Alert("You need to accept the permission request to allow Notifications", "Permission", function(){
            console.log("Attempting to uncheck the checkbox...");
            $("#Settings_Notifications").prop("checked", false);
        });
    }
}

function EditBuddyWindow(buddy){
    try{
        dhtmlxPopup.hide();
    } catch(e){}

    var buddyObj = null;
    var itemId = -1;
    var json = JSON.parse(localDB.getItem("UserBuddiesJson"));
    $.each(json.DataCollection, function (i, item) {
        if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
            // extension
            buddyObj = item;
            itemId = i;
        }
    });

    if(buddyObj == null){
        Alert("This item was not found", "Error");
        return;
    }
    
    var cropper;
    
    var html = "<div border=0 class='UiWindowField scroller'>";

    html += "<div id=ImageCanvas style=\"width:150px; height:150px\"></div>";
    html += "<div style=\"float:left; margin-left:200px;\"><input id=fileUploader type=file></div>";
    html += "<div style=\"margin-top: 50px\"></div>";
    
    html += "<div class=UiText>Full Name:</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='eg: Keyla James' value='"+ buddyObj.DisplayName +"'></div>";

    html += "<div class=UiText>Title / Description:</div>";
    if(buddyObj.Type == "extension"){
        html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='eg: General Manager' value='"+ buddyObj.Position +"'></div>";
    } else {
        html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='eg: General Manager' value='"+ buddyObj.Description +"'></div>";
    }
    html += "<div class=UiText>Mobile Number:</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=text placeholder='eg: +44 123-456 7890' value='"+ buddyObj.MobileNumber +"'></div>";

    html += "<div class=UiText>Email:</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=text placeholder='eg: Keyla.James@raspberrypi.org' value='"+ buddyObj.Email +"'></div>";

    html += "<div class=UiText>Contact Number 1:</div>";
    html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='eg: +1 234 567 8901' value='"+ buddyObj.ContactNumber1 +"'></div>";

    html += "<div class=UiText>Contact Number 2:</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='eg: +441234567890' value='"+ buddyObj.ContactNumber2 +"'></div>";
    html += "</div>"
    OpenWindow(html, "Edit", 480, 640, false, true, "Save", function(){

        buddyObj.LastActivity = utcDateNow();
        buddyObj.DisplayName = $("#AddSomeone_Name").val();
        if(buddyObj.Type == "extension"){
            buddyObj.Position = $("#AddSomeone_Desc").val();
        } else {
            buddyObj.Description = $("#AddSomeone_Desc").val();
        }
        buddyObj.MobileNumber = $("#AddSomeone_Mobile").val();
        buddyObj.Email = $("#AddSomeone_Email").val();
        buddyObj.ContactNumber1 = $("#AddSomeone_Num1").val();
        buddyObj.ContactNumber2 = $("#AddSomeone_Num2").val();

        // Update Image
        $("#ImageCanvas").croppie('result', { type: 'base64', size: 'viewport', format: 'png', quality: 1, circle: false }).then(function(base64) {
            if(buddyObj.Type == "extension"){
                localDB.setItem("img-"+ buddyObj.uID +"-extension", base64);
            } else if(buddyObj.Type == "contact") {
                localDB.setItem("img-"+ buddyObj.cID +"-contact", base64);
            } else if(buddyObj.Type == "group") {
                localDB.setItem("img-"+ buddyObj.gID +"-group", base64);
            }
            // Update
            UpdateBuddyList();
        });

        // Update: 
        json.DataCollection[itemId] = buddyObj;

        // Save To DB
        localDB.setItem("UserBuddiesJson", JSON.stringify(json));

        // Update the Memory Array, so that the UpdateBuddyList can make the changes
        for(var b = 0; b < Buddies.length; b++)
        {
            if(buddyObj.Type == "extension"){
                if(buddyObj.uID == Buddies[b].identity){
                    Buddies[b].CallerIDName = buddyObj.DisplayName;
                    Buddies[b].Desc = buddyObj.Position;
                }                
            } else if(buddyObj.Type == "contact") {
                if(buddyObj.cID == Buddies[b].identity){
                    Buddies[b].CallerIDName = buddyObj.DisplayName;
                    Buddies[b].Desc = buddyObj.Description;
                }                
            } else if(buddyObj.Type == "group") {
                
            }
        }

        CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    }, function(){
        // DoOnLoad
        cropper = $("#ImageCanvas").croppie({
            viewport: { width: 150, height: 150, type: 'circle' }
        });

        // Preview Existing Image
        if(buddyObj.Type == "extension"){
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyObj.uID, "extension") }).then();
        } else if(buddyObj.Type == "contact") {
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyObj.cID, "contact") }).then();
        }else if(buddyObj.Type == "group") {
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyObj.gID, "group") }).then();
        }

        // Wireup File Change
        $("#fileUploader").change(function () {
            var filesArray = $(this).prop('files');
        
            if (filesArray.length == 1) {
                var uploadId = Math.floor(Math.random() * 1000000000);
                var fileObj = filesArray[0];
                var fileName = fileObj.name;
                var fileSize = fileObj.size;
        
                if (fileSize <= 52428800) {
                    console.log("Adding (" + uploadId + "): " + fileName + " of size: " + fileSize + "bytes");
        
                    var reader = new FileReader();
                    reader.Name = fileName;
                    reader.UploadId = uploadId;
                    reader.Size = fileSize;
                    reader.onload = function (event) {
                        $("#ImageCanvas").croppie('bind', {
                            url: event.target.result
                        });
                    };
        
                    // Use onload for this
                    reader.readAsDataURL(fileObj);
                }
                else {
                    Alert("The file '" + fileName + "' is bigger than 50MB, you cannot upload this file", "File Error");
                }
            } else {
                Alert("Select a single file", "File Error");
            }
        });

    });
}

// Document Ready
// ==============
$(document).ready(function () {

    // Init UI
    // =======
    windowsCollection = new dhtmlXWindows("material");
    messagingCollection = new dhtmlXWindows("material");

    $("#UserDID").html(profileUser);
    $("#UserCallID").html(profileName);
    $("#UserProfilePic").css("background-image", "url('"+ getPicture("profilePicture") +"')");

    $("#txtFindBuddy").on('keyup', function(event){
        UpdateBuddyList(this.value);
    });
    $("#BtnCreateGroup").on('click', function(event){
        CreateGroupWindow();
    });
    $("#BtnAddSomeone, #BtnAddSomeone1").on('click', function(event){
        AddSomeoneWindow();
    });
    $("#ConfigureExtension").on('click', function(event){
        ConfigureExtensionWindow();
    });
    $("#UserProfile").on('click', function(event){
        ShowMyProfileMenu(this);
    });
    
    UpdateUI();
    
    // Check if you account is created
    if(profileUserID == null ){
        ConfigureExtensionWindow();
        return; // Dont load any more, after applying settings, the page must reload.
    }

    PopulateBuddyList();

    // Select Last user
    if(localDB.getItem("SelectedBuddy") != null){
        console.log("Selecting previously selected buddy...", localDB.getItem("SelectedBuddy"));
        SelectBuddy(localDB.getItem("SelectedBuddy"));
    }

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
            userAgentString: userAgentStr,
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
        if(!isReRegister) {
            Subscribe();
        }
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
        Confirm("Error connecting to the server ("+ wssServer +") on the WebSocket port ("+ WebSocketPort +")", "WebSocket Error", function(){
            window.open("https://"+ wssServer +":"+ WebSocketPort +"/httpstatus");
        }, null);
    });
});


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
    console.log("New Incoming Call!");

    var callerID = session.remoteIdentity.displayName;
    var buddy = session.remoteIdentity.uri.user;
    var buddyObj = FindBuddyByExtNo(buddy);
    var CurrentCalls = CallSessions.length;

    // Make content one of its not there
    // =================================
    if(buddyObj == null)
    {

    }

    // Handle the cancel events
    session.on('terminated', function(message, cause) {
        // $("#contact-" + buddy + "-msg").html("Caller Cancelled");
        teardownSession(buddyObj.identity, session, 0, "Call Cancelled");
    });

    // Add to call session array
    // =========================
    addActiveSession(session, false, buddyObj.identity);

    // Setup in-page call notification if you are on me already
    // ========================================================
    $("#contact-" + buddyObj.identity + "-sipCallId").val(session.id);

    if(DoNotDisturbEnabled) {
        RejectCall(buddyObj.identity);
        
        return;
    }
    if(CurrentCalls >= 1){
        if(CallWaitingEnabled == false){
            RejectCall(buddyObj.identity);
        
            return;
        }
    }
    if(AutoAnswerEnabled){
        if(CurrentCalls == 0){ // There are no other calls, so you can answer
            var buddyId = buddyObj.identity;
            window.setTimeout(function(){
                AnswerAudioCall(buddyId);
            }, 1000);

            // Select Buddy
            SelectBuddy(buddyObj.identity);

            return;
        }
    }
    
    // Show the Answer Thingy
    // ======================
    $("#contact-" + buddyObj.identity + "-incomingCallerID").html(callerID); // This may not be nessesary
    $("#contact-" + buddyObj.identity + "-AnswerCall").show();

    // Play Ring Tone if not on the phone
    // ==================================
    // $("#contact-" + buddyObj.identity + "-ringer").play();

    // Check if that buddy is not already on a call??
    // ==============================================
    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
    if (streamVisible) {
        // Not sure if there is anything do do in this case
    } else {
        // Show Call Answer Window
        // =======================
        // ?

        // Add a notification badge
        // ========================
        IncreaseMissedBadge(buddyObj.identity);

        // Show notification
        // =================
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                var noticeOptions = { body: "You have an inbound call from: " + callerID, icon: getPicture(buddyObj.identity) }
                var inComingCallNotification = new Notification("Incoming Call", noticeOptions);
                inComingCallNotification.onclick = function (event) {

                    var buddyId = buddyObj.identity;
                    window.setTimeout(function(){
                        AnswerAudioCall(buddyId);
                    }, 1000);

                    // Select Buddy
                    SelectBuddy(buddyObj.identity);

                    return;
                }
            }
        }
    }
}
function AnswerAudioCall(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        
        var spdOptions = {
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: {
                        deviceId: (getAudioSrcID() != "default")? { exact: getAudioSrcID() } : "default"
                    },
                    video: false
                }
            }
        }
        // Add additional Constraints
        var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
        if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
        if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

        session.accept(spdOptions);
        
        wireupAudioSession(session, "inbound", buddy);
        $("#contact-" + buddy + "-msg").html("Audo Call in Progress!");
    } else {
        $("#contact-" + buddy + "-msg").html("Audo Answer failed, null session");
    }
    $("#contact-" + buddy + "-AnswerCall").hide();
}
function AnswerVideoCall(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        // TODO: validate devices

        var spdOptions = {
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: {
                        deviceId: (getAudioSrcID() != "default")? { exact: getAudioSrcID() } : "default"
                    },
                    video: {
                        deviceId: (getVideoSrcID() != "default")?  { exact: getVideoSrcID() } : "default"
                    }
                }
            }
        }
        // Add additional Constraints
        if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
        if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
        if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;

        var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
        if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
        if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

        session.accept(spdOptions);

        wireupVideoSession(session, "inbound", buddy);
        $("#contact-" + buddy + "-msg").html("Audo Call in Progress!");
    } else {
        $("#contact-" + buddy + "-msg").html("Video Answer failed, null session");
    }
    $("#contact-" + buddy + "-AnswerCall").hide();
}
function RejectCall(buddy) {
    var session = getSession(buddy);
    if (session != null) {
        session.reject({ 
            statusCode: 486, 
            reasonPhrase: "Busy Here" 
        });
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

        // Gets Remote Audio Track
        // =======================
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track && receiver.track.kind == "audio"){
                try {
                    remoteStream.addTrack(receiver.track);
                } catch (e) {
                    console.error(e);
                }
            } 
        });
        var remoteAudio = $("#contact-" + buddy + "-remoteAudio").get(0);
        remoteAudio.srcObject = remoteStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(getAudioOutputID()).then(function(){
                    console.log("sinkId applied: "+ getAudioOutputID());
                }).catch(function(e){
                    console.error("Error using setSinkId: ", e);
                });            
            }
            remoteAudio.play();
        }
        /*
        // Note: There appears to be a bug in the peerConnection.getSenders()
        // The array returns but may or may not be fully populated by the RTCRtpSender
        // The track property appears to be null initially and then moments later populated.
        // This does not appear to be the case when oritionisting a call, mostly when receiving a call.
        window.setTimeout(function(){
            // Get your Local track
            // ====================
            var pc = session.sessionDescriptionHandler.peerConnection;
            var localStream = new MediaStream();
            pc.getSenders().forEach(function (sender) {
                if(sender.track && sender.track.kind == "audio"){
                    try {
                        localStream.addTrack(sender.track);
                    } catch (e) {
                        console.error("Failed to Add Sender Audio Track:", e);
                    }
                }
            });
        }, 1000);
        */
    });
    session.on('accepted', function (data) {
        $(MessageObjId).html("Audo Call in Progress!");

        $("#contact-" + buddy + "-progress").hide();
        $("#contact-" + buddy + "-VideoCall").hide();
        $("#contact-" + buddy + "-ActiveCall").show();

        // Start Local Audio Monitoring
        StartLocalAudioMediaMonitoring(buddy, session);

        // Start Remote Audio Monitoring
        StartRemoteAudioMediaMonitoring(buddy, session);
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
    $("#contact-" + buddy + "-btn-audioCall").prop('disabled', 'disabled');
    $("#contact-" + buddy + "-btn-videoCall").prop('disabled', 'disabled');
    $("#contact-" + buddy + "-btn-search").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-remove").prop('disabled', 'disabled');

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

        // Gets remote tracks
        var pc = session.sessionDescriptionHandler.peerConnection;
        var remoteAudioStream = new MediaStream();
        var remoteVideoStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track){
                if(receiver.track.kind == "audio"){
                    try{
                        remoteAudioStream.addTrack(receiver.track);
                    } catch (e) {
                        console.error(e);
                    }
                }
                if(receiver.track.kind == "video"){
                    try{
                        remoteVideoStream.addTrack(receiver.track);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        var remoteAudio = $("#contact-" + buddy + "-remoteAudio").get(0);
        remoteAudio.srcObject = remoteAudioStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(getAudioOutputID()).then(function(){
                    console.log("sinkId applied: "+ getAudioOutputID());
                }).catch(function(e){
                    console.error("Error using setSinkId: ", e);
                });
            }
            remoteAudio.play();
        }

        var remoteVideo = $("#contact-" + buddy + "-remoteVideo").get(0);
        remoteVideo.srcObject = remoteVideoStream;
        remoteVideo.onloadedmetadata = function(e) {
            remoteVideo.play();
        }

        // Note: There appears to be a bug in the peerConnection.getSenders()
        // The array returns but may or may not be fully populated by the RTCRtpSender
        // The track property appears to be null initially and then moments later populated.
        // This does not appear to be the case when oritionisting a call, mostly when receiving a call.
        window.setTimeout(function(){
            var localVideoStream = new MediaStream();
            var pc = session.sessionDescriptionHandler.peerConnection;
            pc.getSenders().forEach(function (sender) {
                if(sender.track && sender.track.kind == "video"){
                    try{
                        localVideoStream.addTrack(sender.track);
                    } catch (e) {
                        console.error("Failed to Add Sender Video Track:", e);
                    }
                }
            });
            var localVideo = $("#contact-" + buddy + "-localVideo").get(0);
            localVideo.srcObject = localVideoStream;
            localVideo.onloadedmetadata = function(e) {
                localVideo.play();
            }
        }, 1000);
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
        $("#contact-" + buddy + "-ActiveCall").show();

        StartLocalAudioMediaMonitoring(buddy, session);
        StartRemoteAudioMediaMonitoring(buddy, session);
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
        console.log("session reinvited!");
    });
    // dtmf

    $("#contact-" + buddy + "-btn-settings").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-shareFiles").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-audioCall").prop('disabled','disabled');
    $("#contact-" + buddy + "-btn-videoCall").prop('disabled','disabled');
    $("#contact-" + buddy + "-btn-search").removeAttr('disabled');
    $("#contact-" + buddy + "-btn-remove").prop('disabled','disabled');

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

    // Add to stream
    // =============
    AddCallMessage(buddy, session, reasonCode, reasonText);

    // Remove the session
    // ===================
    $("#contact-" + buddy + "-sipCallId").val("");
    removeSession(session);

    $("#contact-" + buddy + "-scratchpad-container").hide();
    $("#contact-" + buddy + "-sharevideo-contaner").hide();

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
                    var confBuddyObj = FindBuddyByExtNo(JsonEvent.CallerIDNum);
                    var html = "<div id=\"cp-"+ JsonEvent.Conference +"-"+ channel +"\" class=ConferenceParticipant>"
                    html += " <IMG id=picture class=NotTalking src='"+ getPicture((confBuddyObj != null)? confBuddyObj.identity : "-") +"'>"; // Convert Extension Number to uID
                    html += " <div>" + JsonEvent.CallerIDNum +" - "+ JsonEvent.CallerIDName +"</div>";
                    html += (JsonEvent.Muted == "No")? "<div class=presenceText id=Muted>" + unMutedHTML +"</div>" : "<div class= id=Muted>" + mutedHTML +"</div>";
                    html += "</div>";
                    $("#contact-" + buddy + "-conference").append(html);
                }
                else if(JsonEvent.Event == "ConfbridgeTalking") {
                    if(JsonEvent.TalkingStatus == "on"){
                        console.log("Buddy: "+ JsonEvent.CallerIDNum +" is Talking in Conference "+ JsonEvent.Conference);
                        $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #picture").prop("class", "Talking");
                    }
                    else {
                        console.log("Buddy: "+ JsonEvent.CallerIDNum +" is Not Talking in Conference "+ JsonEvent.Conference);
                        $("#contact-" + buddy + "-conference #cp-"+ JsonEvent.Conference +"-"+ channel +" #picture").prop("class", "NotTalking");
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
function StartRemoteAudioMediaMonitoring(buddy, session) {
    for (var a = 0; a < RemoteAudioMeters.length; a++) {
        try{
            var soundMeter = RemoteAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("RemoteAudio AudioContext alerady existing for call: " + session.id);

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

    // Create local SoundMeter
    // =======================
    var soundMeter = new SoundMeter(session.id, buddy);
    if(soundMeter == null){
        console.warn("AudioContext() RemoteAudio not available... it fine.");
        return;
    }

    // Ready the getStats request
    // ==========================
    var remoteAudioStream = new MediaStream();
    var audioReceiver = null;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getReceivers().forEach(function (RTCRtpReceiver) {
        if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio"){
            if(audioReceiver == null)
            {
                try{
                    remoteAudioStream.addTrack(RTCRtpReceiver.track);
                }catch(e){
                    console.log("Error adding Track: "+ RTCRtpReceiver.track.label);
                }
                audioReceiver = RTCRtpReceiver;
            } else{
                console.log("Found another Track, but audioReceiver not null");
                console.log(RTCRtpReceiver);
                console.log(RTCRtpReceiver.track);
            }
        }
    });


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
    soundMeter.connectToSource(remoteAudioStream, function (e) {
        if (e != null) return;


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
function StartLocalAudioMediaMonitoring(buddy, session) {
    for (var a = 0; a < LocalAudioMeters.length; a++) {
        try{
            var soundMeter = LocalAudioMeters[a];
            if (session.id == soundMeter.sessionId) {
                console.log("LocalAudio AudioContext alerady existing for call: " + session.id);

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

    // Create local SoundMeter
    // =======================
    var soundMeter = new SoundMeter(session.id, buddy);
    if(soundMeter == null){
        console.warn("AudioContext() LocalAudio not available... its fine.")
        return;
    }

    // Ready the getStats request
    // ==========================
    var localAudioStream = new MediaStream();
    var audioSender = null;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio"){
            if(audioSender == null){
                try{
                    localAudioStream.addTrack(RTCRtpSender.track);
                }catch(e){
                    console.log("Error adding Track: "+ RTCRtpSender.track.label);
                }
                audioSender = RTCRtpSender;
            } else{
                console.log("Found another Track, but audioSender not null");
                console.log(RTCRtpSender);
                console.log(RTCRtpSender.track);
            }
        }
    });

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
    soundMeter.connectToSource(localAudioStream, function (e) {
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
function SoundMeter(sessionId, buddy) {

    var audioContext = null;
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    }
    catch(e){
        console.warn("AudioContext() LocalAudio not available... its fine.")
    }
    if(audioContext == null) return null;

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

    this.context = audioContext;
    this.instant = 0.0;
    this.slow = 0.0;
    this.clip = 0.0;
    this.script = audioContext.createScriptProcessor(2048, 1, 1);
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
        console.error(e); // Probably not audio track
        callback(e);
    }
}
SoundMeter.prototype.stop = function () {
    console.log("Disconnecting SoundMeter...");

    try{
        window.clearInterval(this.levelsInterval);
        this.levelsInterval = null;
    }catch(e){}

    try{
        window.clearInterval(this.networkInterval);
        this.networkInterval = null;
    }catch(e){}

    this.mic.disconnect();
    this.script.disconnect();

    this.mic = null;
    this.script = null;
    try{
        this.context.close();
    } catch(e){}
    this.context = null;
}
function MeterSettingsOutput(audioStream, objectId, direction, interval){
    var soundMeter = new SoundMeter(null, null);
    soundMeter.startTime = Date.now();
    soundMeter.connectToSource(audioStream, function (e) {
        if (e != null) return;

        console.log("SoundMeter Connected, displaying levels to:"+ objectId);
        soundMeter.levelsInterval = window.setInterval(function () {
            // soundMeter.slow
            // soundMeter.clip;

            // Calculate Levels
            // ================
            //value="0" max="1" high="0.25" (this seems low... )
            var level = soundMeter.instant * 4.0;
            if (level > 1) level = 1;
            var instPercent = level * 100;

            $("#"+objectId).css(direction, instPercent.toFixed(2) +"%"); // Settings_MicrophoneOutput "width" 50
        }, interval);
    });

    return soundMeter;
}

// Presence / Subscribe
// ====================
function Subscribe() {
    var myAuth = SipUsername;

    console.log("Subscribe to voicemail Messages...");

    // Voicemail notice
    var vmOptions = { expires: 300 };
    voicemailSubs = userAgent.subscribe(myAuth + "@" + wssServer, 'message-summary', vmOptions); // message-summary = voicemail messages
    voicemailSubs.on('notify', function (notification) {
        // $("#msg").html("You have voicemail: \n" + notification.request.body);
        console.log("You have voicemail: \n" + notification.request.body);
    });

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
        if (SipUsername != me) return;

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
            $("#contact-" + buddyObj.identity + "-devstate").prop("class", dotClass);
            $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", dotClass);
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
            $("#contact-" + buddyObj.identity + "-devstate").prop("class", dotClass);
            $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", dotClass);
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
            $("#contact-" + buddyObj.identity + "-devstate").prop("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-presence").html("Unknown");
            $("#contact-" + buddyObj.identity + "-presence-main").html("Unknown");
        }
    }
}

// Buddy: Chat / Instant Message / XMPP
// ====================================
function InitinaliseStream(buddy){
    var template = { TotalRows:0, DataCollection:[] }
    localDB.setItem(buddy + "-stream", JSON.stringify(template));
    return JSON.parse(localDB.getItem(buddy + "-stream"));
}
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
    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss UTC");

    // Current Stream
    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitinaliseStream(buddy);

    // Add New Message
    var newMessageJson = {
        ItemType: "MSG",
        ItemDate: DateTime,
        SrcUserId: profileUserID,
        Src: "\""+ profileName +"\" <"+ profileUser +">",
        DstUserId: buddy,
        Dst: "",
        Billsec: "0",
        MessageData: message
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    // Post Add Activity
    $("#contact-" + buddy + "-ChatMessage").val("");

    ClearChatPreview(buddy);
    UpdateBuddyActivity(buddy);
}
function ReceiveMessage(message) {
    console.log("New Incoming Message!");

    var fromSipUri = "" + message.remoteIdentity.uri; //sip:200@192.168.88.98
    var extNo = fromSipUri.split("@")[0].split(":")[1];
    var fromName = message.remoteIdentity.displayName;
    var origionalMessage = message.body;
    var formattedMessage = ReformatMessage(message.body); // Check if its Json ??

    var buddyObj = FindBuddyByExtNo(extNo);
    if(buddyObj == null) return;                        // TODO: make contact because if its not found

    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");

    // Get the actual Person sending (since all group messages come from the group)
    var ActualSender = "";
    if(buddyObj.type == "group"){
        var assertedIdentity = message.request.headers["P-Asserted-Identity"][0].raw; // Name Surname <ExtNo> 
        // console.log(assertedIdentity);
        var bits = assertedIdentity.split(" <");
        var CallerID = bits[0];
        var CallerIDNum = bits[1].replace(">", "");

        ActualSender = CallerID; // P-Asserted-Identity;
    }

    // Current Stream
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream == null) currentStream = InitinaliseStream(buddyObj.identity);

    // Add New Message
    var newMessageJson = {
        ItemType: "MSG",
        ItemDate: DateTime,
        SrcUserId: buddyObj.identity,
        Src: "\""+ buddyObj.CallerIDName +"\" <"+ buddyObj.ExtNo +">",
        DstUserId: profileUserID,
        Dst: "",
        Billsec: "0",
        MessageData: origionalMessage
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

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
                var imageUrl = getPicture(buddyObj.identity);
                var noticeOptions = { body: origionalMessage.substring(0, 250), icon: imageUrl }
                var inComingChatNotification = new Notification("Message from : " + buddyObj.CallerIDName, noticeOptions);
                inComingChatNotification.onclick = function (event) {
                    // Show Message
                    SelectBuddy(buddyObj.identity);
                }
            }
        }

    }
}
function AddCallMessage(buddy, session, reasonCode, reasonText) { //(buddy, session, reasonCode, reasonText, "...")

    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss UTC");

    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitinaliseStream(buddy);

    var message = "Call with " + buddy + " ended: " + reasonText + " (" + reasonCode + ")";

    var newMessageJson = {
        ItemType: "CDR",
        ItemDate: DateTime,
        SrcUserId: "8D68B3EFEC8D0F5",
        Src: "100",
        DstUserId: "8D68C1D442A96B4",
        Dst: "800",
        Billsec: "13",
        MessageData: message
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    UpdateBuddyActivity(buddy);
}
function SendImageDataMessage(buddy, ImgDataUrl) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

    // Ajax Upload
    // ===========

    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss UTC");
    var formattedMessage = '<IMG class=previewImage onClick="PreviewImage(this)" src="'+ ImgDataUrl +'">';
    var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"width: 80px\">"
        + "<div class=messageDate>" + DateTime + "</div>"
        + "</td><td>"
        + "<div class=ourChatMessageText>" + formattedMessage + "</div>"
        + "</td><td style=\"width: 30px\">"
        + "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url('"+ getPicture("profilePicture") +"')\"></div>"
        + "</td></tr></table>";
    $("#contact-" + buddy + "-ChatHistory").append(messageString);
    updateScroll(buddy);

    ImageEditor_Cancel(buddy);

    UpdateBuddyActivity(buddy);
}
function SendFileDataMessage(buddy, FileDataUrl, fileName, fileSize) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

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
    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");

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
        + "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url('"+ getPicture("profilePicture") +"')\"></div>"
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
    OpenWindow(obj.src, "Preview Image", 600, 800, false, true); //no close, no resize
}

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
                    deviceId: (getAudioSrcID() != "default")? { exact: getAudioSrcID() } : "default"
                },
                video: {
                    deviceId: (getVideoSrcID() != "default")?  { exact: getVideoSrcID() } : "default"
                }
            }
        }
    }
    // Add additional Constraints
    if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
    if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
    if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        var currentVideoDevice = getVideoSrcID();
        var currentAudioDevice = getAudioSrcID();

        var hasVideoDevice = false;
        var confirmedVideoDevice = false;

        var hasAudioDevice = false;
        var confirmedAudioDevice = false;

        for (var i = 0; i < deviceInfos.length; ++i) {
            if (deviceInfos[i].kind === "audioinput") {
                hasAudioDevice = true;
                if(currentAudioDevice != "default" && currentAudioDevice == deviceInfos[i].deviceId)
                {
                    confirmedAudioDevice = true;
                }                
            }
            else if (deviceInfos[i].kind === "audiooutput") {
                // Speakers... not always available
            }
            else if (deviceInfos[i].kind === "videoinput") {
                hasVideoDevice = true;
                if(currentVideoDevice != "default" && currentVideoDevice == deviceInfos[i].deviceId)
                {
                    confirmedVideoDevice = true;
                }
            }
        }

        // Check devices
        if(hasAudioDevice == false){
            Alert("Sorry, you don't have any Microphone connected to this computer. You cannot make calls.");
            return;
        }
        if(hasVideoDevice == false) {
            Alert("Sorry, you don't have any WebCam/Video Source connected to this computer. You cannot use the video option.");
            return;
        }
        if(currentAudioDevice != "default" && !confirmedAudioDevice) {
            console.warn("The audio device you used before is no longer availabe, default settings applied.");
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        }
        if(currentVideoDevice != "default" && !confirmedVideoDevice) {
            console.warn("The video device you used before is no longer availabe, default settings applied.");
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = "default";
        }

        $("#contact-" + buddyObj.identity + "-msg").html("Starting Video Call...");

        // Invite
        // ======
        console.log("INVITE (video): " + buddyObj.ExtNo + "@" + wssServer);
        var session = userAgent.invite("sip:" + buddyObj.ExtNo + "@" + wssServer, spdOptions);

        session.data.VideoSourceDevice = getVideoSrcID();
        session.data.AudioSourceDevice = getAudioSrcID();
        session.data.AudioOutputDevice = getAudioOutputID();

        // Add Call to CallSessions
        // ========================
        addActiveSession(session, true, buddyObj.identity);

        // Do Nessesary UI Wireup
        // ======================
        wireupVideoSession(session, buddyObj.type, buddyObj.identity);

        // List Update
        // ===========
        UpdateBuddyActivity(buddyObj.identity);

    }).catch(function(e){
        console.error(e);
    });
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
        // Extension
        var items = [
            {id: 1, name: "<i class=\"fa fa-phone-square\"></i> Call Extension", number: buddyObj.ExtNo},
        ];
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") items.push({id: 2, name: "<i class=\"fa fa-mobile\"></i> Call Mobile", number: buddyObj.MobileNumber});
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") items.push({id: 3, name: "<i class=\"fa fa-phone\"></i> Call Number", number: buddyObj.ContactNumber1});
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") items.push({id: 4, name: "<i class=\"fa fa-phone\"></i> Call Number", number: buddyObj.ContactNumber2});
        dhtmlxPopup.attachList("name,number", items);
        dhtmlxPopup.attachEvent("onClick", function(id){
            var NumberToDial = dhtmlxPopup.getItemData(id).number;
            console.log("Menu click AudioCall("+ buddy +", "+ NumberToDial +")");
            dhtmlxPopup.hide();
            AudioCall(buddy, NumberToDial);
        });
    } else if(buddyObj.type == "contact") {
        // Contact
        var items = [];
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") items.push({id: 1, name: "<i class=\"fa fa-mobile\"></i> Call Mobile", number: buddyObj.MobileNumber});
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") items.push({id: 2, name: "<i class=\"fa fa-phone\"></i> Call Number", number: buddyObj.ContactNumber1});
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") items.push({id: 3, name: "<i class=\"fa fa-phone\"></i> Call Number", number: buddyObj.ContactNumber2});
        dhtmlxPopup.attachList("name,number", items);
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
                    deviceId: (getAudioSrcID() != "default")? { exact: getAudioSrcID() } : "default"
                },
                video: false
            }
        }
    }
    // Add additional Constraints
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        var currentAudioDevice = getAudioSrcID();

        var hasAudioDevice = false;
        var confirmedAudioDevice = false;

        for (var i = 0; i < deviceInfos.length; ++i) {
            if (deviceInfos[i].kind === "audioinput") {
                hasAudioDevice = true;
                if(currentAudioDevice != "default" && currentAudioDevice == deviceInfos[i].deviceId)
                {
                    confirmedAudioDevice = true;
                }                
            }
            else if (deviceInfos[i].kind === "audiooutput") {
                // Speakers... not always available
            }
            else if (deviceInfos[i].kind === "videoinput") {
                // Ignore
            }
        }

        // Check devices
        if(hasAudioDevice == false){
            Alert("Sorry, you don't have any Microphone connected to this computer. You cannot make calls.");
            return;
        }
        if(confirmedAudioDevice != "default" && !confirmedAudioDevice) {
            console.warn("The audio device you used before is no longer availabe, default settings applied.");
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        }

        $("#contact-" + buddyObj.identity + "-msg").html("Starting Audio Call...");

        // Invite
        console.log("INVITE (audio): " + dialledNumber + "@" + wssServer);
        var session = userAgent.invite("sip:" + dialledNumber + "@" + wssServer, spdOptions);

        // Add Call to CallSessions
        // ========================
        addActiveSession(session, true, buddyObj.identity);

        wireupAudioSession(session, buddyObj.type, buddyObj.identity);

        // List Update
        // ===========
        UpdateBuddyActivity(buddy);

    }).catch(function(e){
        console.error(e);
    });
}

// Sessions & During Call Activity
// ===============================
function addActiveSession(session, setActive, buddyId)
{
    console.log("Adding Session...");

    // Put all the other calls on hold
    if(setActive) {
        for(var c=0; c<CallSessions.length; c++)
        {
            if(CallSessions[c].local_hold == false) CallSessions[c].hold();
            CallSessions[c].data.IsCurrentCall = false;
        }
    }
    
    session.data.buddyId = buddyId;
    session.data.IsCurrentCall = setActive;
    CallSessions.push(session);
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

    for(var c=0; c<CallSessions.length; c++)
    {
        if(CallSessions[c].data.IsCurrentCall)
        {
            console.log("Putting an active call on hold");

            if(CallSessions[c].local_hold == false && CallSessions[c].data.buddyId != buddy) CallSessions[c].hold();
            CallSessions[c].data.IsCurrentCall = false;
        }
    }

    var newSession = getSession(buddy);
    if(newSession != null)
    {
        console.log("Taking call off hold: "+ buddy);

        if(newSession.local_hold == true && newSession.data.buddyId != buddy) newSession.unhold();
        newSession.data.IsCurrentCall = true;
    }
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
    // console.warn("Could not find session for: "+ buddy);
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
                deviceId: (srcId != "default")? { exact: srcId } : "default",
            }
        }

        // Add additional Constraints
        if(maxFrameRate != "") constraints.video.frameRate = maxFrameRate;
        if(videoHeight != "") constraints.video.height = videoHeight;
        if(videoAspectRatio != "") constraints.video.aspectRatio = videoAspectRatio;

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
        localVideo.onloadedmetadata = function(e) {
            localVideo.play();
        }
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
        newCanvas.prop("id", "contact-" + buddy + "-scratchpad");
        newCanvas.css("border", "1px solid #CCCCCC");
        $("#contact-" + buddy + "-scratchpad-container").append(newCanvas);
        $("#contact-" + buddy + "-scratchpad-container").show();

        console.log("Canvas for Scratchpad created...");
        $("#contact-" + buddy + "-scratchpad").prop("width", 640); // SD
        $("#contact-" + buddy + "-scratchpad").prop("height", 360); // SD


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
        localVideo.onloadedmetadata = function(e) {
            localVideo.play();
        }
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
        // src = "{{%global.CloudFrontUrl%}}/assets/img/chrome.webm";

        $("#contact-" + buddy + "-sharevideo-contaner").empty();

        session.data.VideoSourceDevice = "video";

        // Create Video Object
        // ===================
        var newVideo = $('<video/>');
        newVideo.prop("id", "contact-" + buddy + "-sharevideo");
        newVideo.prop("controls",true);
        newVideo.prop("crossorigin", "anonymous");
        newVideo.prop("src", src);
        newVideo.css("max-width", "640px");
        newVideo.css("max-height", "360x");
        // newVideo.prop("muted",true);
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
            localVideo.onloadedmetadata = function(e) {
                localVideo.play();
            }
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
                    if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
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
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
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
                    if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
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
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
            }).catch(function (err) {
                console.error("Error on getUserMedia");
            });
        } 
        else {
            // Firefox, apparently
            var screenShareConstraints = { video: { mediaSource: 'screen' }, audio: false }
            navigator.mediaDevices.getUserMedia(screenShareConstraints).then(function(newStream) {
                console.log("navigator.mediaDevices.getUserMedia")
                var newMediaTrack = newStream.getVideoTracks()[0];
                pc.getSenders().forEach(function (RTCRtpSender) {
                    if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
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
                localVideo.onloadedmetadata = function(e) {
                    localVideo.play();
                }
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
var Buddy = function(type, identity, CallerIDName, ExtNo, MobileNumber, ContactNumber1, ContactNumber2, lastActivity, desc, Email){
    this.type = type; // extension | contact | group
    this.identity = identity;
    this.CallerIDName = CallerIDName;
    this.Email = Email;
    this.Desc = desc;
    this.ExtNo = ExtNo;
    this.MobileNumber = MobileNumber;
    this.ContactNumber1 = ContactNumber1;
    this.ContactNumber2 = ContactNumber2;
    this.lastActivity = lastActivity; // Full Date as string eg "1208-03-21 15:34:23 UTC"
    this.devState = "dotOffline";
    this.presence = "Unknown";
    this.missed = 0;
    this.IsSelected = false;
}
function InitUserBuddies(){
    var template = { TotalRows:0, DataCollection:[] }
    localDB.setItem("UserBuddiesJson", JSON.stringify(template));
    return JSON.parse(localDB.getItem("UserBuddiesJson"));
}
function AddBuddy(buddyObj, update, focus){

    Buddies.push(buddyObj);
    if(update) UpdateBuddyList();

    AddBuddyMessageStream(buddyObj);

    if(focus) SelectBuddy(buddyObj.identity);
}
function PopulateBuddyList()
{
    console.log("Clearing Buddies...");
    Buddies = new Array();
    console.log("Adding Buddies...");
    var json = JSON.parse(localDB.getItem("UserBuddiesJson"));
    if(json == null) return;

    console.log("Total Buddies: " + json.TotalRows);
    $.each(json.DataCollection, function (i, item) {
        if(item.Type == "extension"){
            // extension
            var buddy = new Buddy("extension", item.uID, item.DisplayName, item.ExtensionNumber, item.MobileNumber, item.ContactNumber1, item.ContactNumber2, item.LastActivity, item.Position, item.Email);
            AddBuddy(buddy, false, false);
        }
        else if(item.Type == "contact"){
            // contact
            var buddy = new Buddy("contact", item.cID, item.DisplayName, "", item.MobileNumber, item.ContactNumber1, item.ContactNumber2, item.LastActivity, item.Description, item.Email);
            AddBuddy(buddy, false, false);
        }
        else if(item.Type == "group"){
            // group
            var buddy = new Buddy("group", item.gID, item.DisplayName, item.ExtensionNumber, "", "", "", item.LastActivity, item.MemberCount + " member(s)", item.Email);
            AddBuddy(buddy, false, false);
        }
    });

    // Update List (after add)
    console.log("Updating Buddy List...");
    UpdateBuddyList();
}
function UpdateBuddyList(filter){
    $("#myContacts").empty();

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

    for(var b = 0; b < Buddies.length; b++)
    {
        var buddyObj = Buddies[b];

        if(filter && filter.length >= 1){
            // Perform Filter Display
            var display = false;
            if(buddyObj.CallerIDName.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.ExtNo.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.Desc.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
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
            html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity) +"')\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-phone-square\"></i> "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-presence\" class=presenceText>"+ buddyObj.presence +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "contact") { // An Addressbook Contact
            // Left
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class=buddy onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'contact')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">0</span>";
            html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"contact") +"')\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-address-card\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "group"){ // A collection of extensions and contacts
            // Left
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class=buddy onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'group')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">0</span>";
            html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"group") +"')\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-users\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
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
        html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity) +"')\"></div>";
    }
    else if(buddyObj.type == "contact") {
        html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"contact") +"')\"></div>";
    }
    else if(buddyObj.type == "group")
    {
        html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"group") +"')\"></div>";
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
        html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
    }
    html += "</div>";

    // Action Buttons
    // ==============
    html += "<div style=\"float:right; line-height: 46px;\">";
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
        // poster=\"/img/extension/"+ buddyObj.identity +".png\"
        html += "<video id=\"contact-"+ buddyObj.identity +"-remoteVideo\" muted class=remoteVideo style=\"width:100%; height:360px\"></video>";
        html += "<video id=\"contact-"+ buddyObj.identity +"-localVideo\" muted class=localVideo></video>";

        html += "<div>";
        html += "<button><i class=\"fa fa-video-camera\"></i> Camera</button>";
        html += "<button><i class=\"fa fa-pencil-square\"></i> Scratchpad</button>";
        html += "<button><i class=\"fa fa-desktop\"></i> Screen</button>";
        html += "<button><i class=\"fa fa-file-video-o\"></i> Video</button>";
        html += "</div>";

        html += "</div>";
    }
    // Audio Call
    html += "<div id=\"contact-"+ buddyObj.identity +"-AudioCall\" style=\"display:none;\">";
    html += "<audio id=\"contact-"+ buddyObj.identity +"-remoteAudio\"></audio>";
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
    html += "<div style=\"margin-top:10px\">";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-microphone\"></i></span> ";
    html += "<span class=meterContainer title=\"Microphone Levels\">";
    html += "<span id=\"contact-"+ buddyObj.identity +"-Mic\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-volume-up\"></i></span> ";
    html += "<span class=meterContainer title=\"Speaker Levels\">";
    html += "<span id=\"contact-"+ buddyObj.identity +"-Speaker\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-settings\" onclick=\"ChangeSettings('"+ buddyObj.identity +"', this)\"><i class=\"fa fa-cogs\"></i> Adjust Device Settings</button>";
    html += "</div>";

    html += "<fieldset class=audioGraphSection style=\"height: 25px\">";
    html += "<legend onclick=\"ToggleThisHeight(this.parentElement,25,400)\" style=\"cursor:pointer\"><i class=\"fa fa-caret-right\"></i> Network Statistics</legend>";
    html += "<div class=\"cleanScroller\" style=\"height: 375px; overflow:auto\">";
    html += "<div style=\"width:0px;\">";
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
    html += "<tr><td class=streamSection style=\"box-shadow: inset 0px 3px 5px 0px rgba(0, 0, 0, 0.25);\">";

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

    // Clean up
}
function SelectBuddy(buddy, typeStr) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    var previouslySelectedBuddy = "";
    $(".buddySelected").each(function () {
        $(this).prop('class', 'buddy');
    });
    $("#contact-" + buddy).prop('class', 'buddySelected');

    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });
    $("#stream-" + buddy).prop('class', 'streamSelected');

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

    // Save Selected
    localDB.setItem("SelectedBuddy", buddy);
}
function CloseBuddy(buddy){

    $(".buddySelected").each(function () {
        $(this).prop('class', 'buddy');
    });
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });

    console.log("Closing: "+ buddy);

    // Make Select
    for(var b = 0; b < Buddies.length; b++){
        Buddies[b].IsSelected = false;
    }
    selectedBuddy = null;

    // Change to Stream if in Narrow view
    UpdateUI();

    // Save Selected
    localDB.setItem("SelectedBuddy", null);
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
function FindBuddyByExtNo(ExtNo){
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].type == "extension" && Buddies[b].ExtNo == ExtNo) return Buddies[b];
    }
    return null;
}
function FindBuddyByNumber(number){
    // Number could be: +XXXXXXXXXX
    // Any special characters must be removed prior to adding
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].MobileNumber == number || Buddies[b].ContactNumber1 == number || Buddies[b].ContactNumber2 == number) {
            return Buddies[b];
        }
    }
    return null;
}
function FindBuddyByIdentity(identity){
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].identity == identity) return Buddies[b];
    }
    return null;
}
function RefreshStream(buddyObj) {
    var json = JSON.parse(localDB.getItem(buddyObj.identity +"-stream"));

    $("#contact-" + buddyObj.identity + "-ChatHistory").empty();
    if(json == null || json.DataCollection == null) return;

    // Sort DataCollection
    json.DataCollection.sort(function(a, b){
        var aMo = moment.utc(a.ItemDate.replace(" UTC", ""));
        var bMo = moment.utc(b.ItemDate.replace(" UTC", ""));
        if (aMo.isSameOrAfter(bMo, "second")) {
            return -1;
        } else return 1;
        return 0;
    });

    $.each(json.DataCollection, function (i, item) {

        var DateTime = moment.utc(item.ItemDate.replace(" UTC", "")).local().calendar(null, { sameElse: 'YYYY-MM-DD' });
        // var DateTime = new Date(item.ItemDate).toLocaleTimeString();
        // var DateTime = moment.utc(item.ItemDate).local().format("YYYY-MM-DD HH:mm:ss") +" UTC";

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
                var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr><td style=\"padding-left:8px; padding-right:8px; white-space: nowrap\">";
                messageString += "<div class=messageDate>" + DateTime + "</div>"
                messageString += "</td><td>"
                messageString += "<div class=ourChatMessageText onClick=\"ShowMessgeMenu(this,'MSG','"+  item.ItemId +"','"+ item.Billsec +"')\" style=\"cursor:pointer\">" + formattedMessage + "</div>"
                messageString += "</td><td style=\"padding-left:8px; padding-right:8px\">"
                messageString += "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url('"+ getPicture("profilePicture") +"')\"></div>"
                messageString += "</td></tr></table>";
            }
            else
            {
                // You are the destination (receiving)
                var ActualSender = "";
                var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr><td style=\"padding-left:8px; padding-right:8px\">";
                messageString += "<div class=\"buddyIconSmall\" style=\"background-image: url('"+ getPicture(item.SrcUserId) +"')\"></div>";
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
                messageString += "<div class=buddyIconSmall style=\"margin-right: 3px; float:right; background-image: url('"+ getPicture("profilePicture") +"')\"></div>";
                messageString += "</td></tr></table>";
            }
            else
            {
                // you(profileUserID) received a call
                var formattedMessage = "<i class=\"fa fa-phone\"></i> You received a call<!-- "+ item.Src +"-->, and spoke for " + item.Billsec + "seconds.";
                if(item.Billsec == "0") formattedMessage = "<i class=\"fa fa-phone\"></i> You missed a call<!-- "+ item.Src +"-->.";
                var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr><td  style=\"padding-left:8px; padding-right:8px\">";
                messageString += "<div class=\"buddyIconSmall\" style=\"background-image: url('"+ getPicture(item.SrcUserId) +"')\"></div>";
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
        else if(item.ItemType == "FILE"){

        }
        else if(item.ItemType == "SMS"){

        }
    });
    updateScroll(buddyObj.identity);
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
function ShowMyProfileMenu(obj){
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
						{id: 2, name: "<i class=\"fa fa-refresh\"></i> Refresh Registration", enabled: ""},
						{id: 3, name: "<i class=\"fa fa-wrench\"></i> Configure Extension", enabled: ""},
                        // Register Automatically, Ring Tone, Ring Device, Volume, Onscreen Notification, CRM Hooks
						dhtmlxPopup.separator,
						{id: 4, name: "<i class=\"fa fa-user-plus\"></i> Add Someone", enabled: ""},
						{id: 5, name: "<i class=\"fa fa-users\"></i><i class=\"fa fa-plus\" style=\"font-size:9px\"></i> Create Group", enabled: ""},
						dhtmlxPopup.separator,
						{id: 6, name: "<i class=\"fa fa-phone\"></i> Auto Answer", enabled: AutoAnswerEnabled? "<i class=\"fa fa-check\"></i>" : "" },
						{id: 7, name: "<i class=\"fa fa-ban\"></i> Do No Disturb", enabled: DoNotDisturbEnabled? "<i class=\"fa fa-check\"></i>" : "" },
						{id: 8, name: "<i class=\"fa fa-volume-control-phone\"></i> Call Waiting", enabled: CallWaitingEnabled? "<i class=\"fa fa-check\"></i>" : ""},
    ]);
    dhtmlxPopup.attachEvent("onClick", function(id){

        if(id == 2) RefreshRegistration();
        if(id == 3) ConfigureExtensionWindow();
        // ---
        if(id == 4) AddSomeoneWindow();
        if(id == 5) CreateGroupWindow();
        // ----
        if(id == 6) ToggleAutoAnswer();
        if(id == 7) ToggleDoNoDisturb();
        if(id == 8) ToggleCallWaiting();

        dhtmlxPopup.hide();
    });
    dhtmlxPopup.show(x, y, w, h);
}
function RefreshRegistration(){
    Unregister();
    console.log("Unregister complete...");
    window.setTimeout(function(){
        console.log("Starting registration...");
        Register();
    }, 1000);
}

function ToggleAutoAnswer(){
    AutoAnswerEnabled = (AutoAnswerEnabled == true)? false : true;
    localDB.setItem("AutoAnswerEnabled", (AutoAnswerEnabled == true)? "1" : "0");
}
function ToggleDoNoDisturb(){
    DoNotDisturbEnabled = (DoNotDisturbEnabled == true)? false : true;
    localDB.setItem("DoNotDisturbEnabled", (DoNotDisturbEnabled == true)? "1" : "0");
}
function ToggleCallWaiting(){
    CallWaitingEnabled = (CallWaitingEnabled == true)? false : true;
    localDB.setItem("CallWaitingEnabled", (CallWaitingEnabled == true)? "1" : "0");
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

    var buddyObj = FindBuddyByIdentity(buddy);

    if(typeStr == "extension")
    {
        var html = "<div style=\"width:200px; cursor:pointer\" onclick=\"EditBuddyWindow('"+ buddy +"')\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('"+ getPicture(buddy, "extension") +"')\"></div>";
        html += "<div id=ProfileInfo style=\"text-align:center\"><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);
        
        // Done
        $("#ProfileInfo").html("");

        $("#ProfileInfo").append("<div class=ProfileTextLarge style=\"margin-top:15px\">"+ buddyObj.CallerIDName +"</div>");
        $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Desc +"</div>");

        $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Extension Number:</div>");
        $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ExtNo +" </div>");

        if(buddyObj.Email != "" && buddyObj.Email != null && buddyObj.Email != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Email:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Email +" </div>");
        }
        if(buddyObj.MobileNumber != "" && buddyObj.MobileNumber != null && buddyObj.MobileNumber != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Mobile:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.MobileNumber +" </div>");
        }
        if(buddyObj.ContactNumber1 != "" && buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Alternate Contact:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber1 +" </div>");
        }
        if(buddyObj.ContactNumber2 != "" && buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Alternate Contact:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber2 +" </div>");
        }
    }
    else if(typeStr == "contact"){
        var html = "<div style=\"width:200px; cursor:pointer\" onclick=\"EditBuddyWindow('"+ buddy +"')\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('"+ getPicture(buddy, "contact") +"')\"></div>";
        html += "<div id=ProfileInfo style=\"text-align:center\"><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);

        $("#ProfileInfo").html("");
        $("#ProfileInfo").append("<div class=ProfileTextLarge style=\"margin-top:15px\">"+ buddyObj.CallerIDName +"</div>");
        $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Desc +"</div>");

        if(buddyObj.Email != "" && buddyObj.Email != null && buddyObj.Email != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Email:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Email +" </div>");
        }
        if(buddyObj.MobileNumber != "" && buddyObj.MobileNumber != null && buddyObj.MobileNumber != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Mobile Number:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.MobileNumber +" </div>");
        }
        if(buddyObj.ContactNumber1 != "" && buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Alternate Contact:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber1 +" </div>");
        }
        if(buddyObj.ContactNumber2 != "" && buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">Alternate Contact:</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber2 +" </div>");
        }
    }
    else if(typeStr == "group"){
        var html = "<div style=\"width:200px; cursor:pointer\" onclick=\"EditBuddyWindow('"+ buddy +"')\">";
        html += "<div class=\"buddyProfilePic\" style=\"background-image:url('"+ getPicture(buddy, "group") +"')\"></div>";
        html += "<div id=ProfileInfo style=\"text-align:center\"><i class=\"fa fa-spinner fa-spin\"></i></div>"
        html += "</div>";
        dhtmlxPopup.attachHTML(html);

        $("#ProfileInfo").html("");

        $("#ProfileInfo").append("<div class=ProfileTextLarge style=\"margin-top:15px\">"+ buddyObj.CallerIDName +"</div>");
        $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Desc +"</div>");
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
    audioSelect.prop("id", "audioSrcSelect");
    audioSelect.css("width", "100%");

    var videoSelect = $('<select/>');
    videoSelect.prop("id", "videoSrcSelect");
    videoSelect.css("width", "100%");

    var speakerSelect = $('<select/>');
    speakerSelect.prop("id", "audioOutputSelect");
    speakerSelect.css("width", "100%");

    var ringerSelect = $('<select/>');
    ringerSelect.prop("id", "ringerSelect");
    ringerSelect.css("width", "100%");

    var session = getSession(buddy);

    if(navigator.mediaDevices) // Only works under HTTPS
    {
        navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        
            var foundVideoSourceDevices = false;
            for (var i = 0; i < deviceInfos.length; ++i) {
                var deviceInfo = deviceInfos[i];
                var devideId = deviceInfo.deviceId;
                var DisplayName = (deviceInfo.label)? deviceInfo.label : "";
                if(DisplayName.indexOf("(")) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));
                console.log("Found Device: ", DisplayName);
    
                // Create Option
                var option = $('<option/>');
                option.prop("value", devideId);
                
                // Handle Type
                if (deviceInfo.kind === "audioinput") {
                    if(session != null){ // We are on a call
                        if(session.data.AudioSourceDevice == devideId) option.prop("selected", true);
                    } else {
                        if(getAudioSrcID() == devideId) option.prop("selected", true);
                    }                    
                    option.text((DisplayName != "")? DisplayName : "Microphone ("+ devideId +")");
                    audioSelect.append(option);
                } else if (deviceInfo.kind === "audiooutput") {
                    if(session != null){ // We are on a call
                        if(session.data.AudioOutputDevice == devideId) option.prop("selected", true);
                    } else {
                        if(getAudioOutputID() == devideId) option.prop("selected", true);
                    }
                    option.text((DisplayName != "")? DisplayName : "Speaker ("+ devideId +")"); 
                    speakerSelect.append(option);
                } else if (deviceInfo.kind === "videoinput") {
                    if(session != null){ // We are on a call
                        if(session.data.VideoSourceDevice == devideId) option.prop("selected", true);
                    } else {
                        if(getVideoSrcID() == devideId) option.prop("selected", true);
                    }
                    option.text((DisplayName != "")? DisplayName : "Webcam ("+ devideId +")");
                    videoSelect.append(option);
                }
            }

            // Add default Option
            // ==================
            var defaultVideoOption = $('<option/>');
            defaultVideoOption.prop("value", "default");
            defaultVideoOption.text("(Default)");
            if(session != null)
            {
                // We are on a call
                if(session.data.VideoSourceDevice == "default")
                {
                    defaultVideoOption.prop("selected", true);
                }
            } else {
                // Not on a call
                if(getVideoSrcID() == "default"){
                    defaultVideoOption.prop("selected", true);
                }
            }
            videoSelect.append(defaultVideoOption);
    
            // Add Scratchpad Option
            // =====================
            var scratchpadOption = $('<option/>');
            scratchpadOption.prop("value", "scratchpad");
            scratchpadOption.text("Scratchpad");
            if(session != null)
            {
                // We are on a call
                if(session.data.VideoSourceDevice == "scratchpad")
                {
                    scratchpadOption.prop("selected", true);
                }
            }
            videoSelect.append(scratchpadOption);
    
            // Add Screen Option
            // =================
            var screenOption = $('<option/>');
            screenOption.prop("value", "screen");
            screenOption.text("My Screen");
            if(session != null)
            {
                // We are on a call
                if(session.data.VideoSourceDevice == "screen")
                {
                    screenOption.prop("selected", true);
                }
            }
            videoSelect.append(screenOption);
    
            // Add Video Option
            // ================
            var videoOption = $('<option/>');
            videoOption.prop("value", "video");
            videoOption.text("Choose Video...");
            if(session != null)
            {
                // We are on a call
                if(session.data.VideoSourceDevice == "video")
                {
                    videoOption.prop("selected", true);
                }
            }
            videoSelect.append(videoOption);
    
            // Handle Audio Source changes (Microphone)
            // ========================================
            audioSelect.change(function(){
                console.log("Call to change Microphone");
                localDB.setItem("AudioSrcId", this.value) // For subsequent calls
    
                // Switch Tracks if you are in a call
                // ==================================
                var session = getSession(buddy);
                if(session != null){
                    var constraints = {
                        audio: {
                            deviceId: (getAudioSrcID() != "default")? { exact: getAudioSrcID() } : "default"
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
                localDB.setItem("AudioOutputId", this.value); // For subsequest calls
    
                var session = getSession(buddy);
                if(session != null){
                    // Also change the sinkId
                    // ======================
                    var sinkId = this.value;
                    console.log("Attempting to set Audio Output SinkID for "+ buddy +" [" + sinkId + "]");
        
                    // Remote Audio
                    var element = $("#contact-"+ buddy +"-remoteAudio").get(0);
                    if(element) {
                        if (typeof element.sinkId !== 'undefined') {
                            element.setSinkId(sinkId).then(function(){
                                console.log("sinkId applied: "+ sinkId);
                            }).catch(function(e){
                                console.error("Error using setSinkId: ", e);
                            });
                        } else {
                            console.warn("setSinkId() is not possible using this browser.")
                        }
                    }
                }
    
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
                        // CORS will prevent almost any video from playing
                        // You will need to uplad to a cloud storage service
                        // and have the file file download and play.

                        OpenWindow('<input type=text id=SelectVideoToSend>', 'Select Video', 480, 640, false, true, "Play", function(){
                            //Play
                            var fileTosend = $("#SelectVideoToSend").val();
                            console.log("About to send video feed..."+ fileTosend);
                            SendVideo(buddy, fileTosend);
                        }, "Cancel", function(){
                            // Cancel
                            CloseWindow();
                        }, function(){
                            // Do OnLoad
                        }, null);
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
                } else {
    
                    // Switch Tracks if you are in a call
                    // ==================================
                    var session = getSession(buddy);
                    if(session != null){
                        switchVideoSource(buddy, this.value)
                    }
    
                    console.log("Saving default Video Source Device as: "+ this.value);
                    localDB.setItem("VideoSrcId", this.value);
    
                    dhtmlxPopup.hide();
                    dhtmlxPopup.unload();
                    dhtmlxPopup = null;
    
                    return;
                }
            });
    
            // Show Popup
            // ==========
            dhtmlxPopup.attachHTML("<div id=DeviceSelector style=\"width:250px\"></DIV>");
            // Mic Serttings
            $("#DeviceSelector").append("<div style=\"margin-top:20px\">Microphone: </div>");
            $("#DeviceSelector").append(audioSelect);
            
            // Speaker
            $("#DeviceSelector").append("<div style=\"margin-top:20px\">Speaker: </div>");
            $("#DeviceSelector").append(speakerSelect);

            // Camera
            $("#DeviceSelector").append("<div style=\"margin-top:20px\">Camera: </div>");
            $("#DeviceSelector").append(videoSelect);

            dhtmlxPopup.show(x, y, w, h);
    
        }).catch(function (error) {
            console.error(error);
        });
    }
}


function ToggleThisHeight(obj,smallHeight,bigHeight)
{
    var $Obj = $(obj);
    if($Obj.height() == smallHeight){
        $Obj.find("i").prop("class", "fa fa-caret-down");
        $Obj.css("height", bigHeight + "px");
    }
    else if($Obj.height() == bigHeight)
    {
        $Obj.find("i").prop("class", "fa fa-caret-right");
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


function getPicture(buddyId, typestr){
    typestr = (typestr)? typestr : "extension";
    var dbImg;
    if(buddyId == "profilePicture"){
        dbImg = localDB.getItem("profilePicture");
    } else {
        dbImg = localDB.getItem("img-"+ buddyId +"-"+ typestr);
    }
    if(dbImg == null || dbImg == "null" || dbImg == "") return hostingPrefex + "default.png";
    // if(dbImg == hostingPrefex +"default.png") return dbImg;
    return dbImg;
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
    newCanvas.prop("id", "contact-" + buddy + "-imageCanvas");
    newCanvas.css("border", "1px solid #CCCCCC");
    $("#contact-" + buddy + "-imagePastePreview").append(newCanvas);
    console.log("Canvas for ImageEditor created...");

    var imgWidth = placeholderImage.width;
    var imgHeight = placeholderImage.height;
    var maxWidth = $("#contact-" + buddy + "-imagePastePreview").width()-2; // for the border
    var maxHeight = 480;
    $("#contact-" + buddy + "-imageCanvas").prop("width", maxWidth);
    $("#contact-" + buddy + "-imageCanvas").prop("height", maxHeight);

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
        $("#contact-" + buddy + "-imageCanvas").prop("width", imgWidth);
        $("#contact-" + buddy + "-imageCanvas").prop("height", imgHeight);
    }
    else {
        console.log("Image is able to fit, resizing canvas...");
        $("#contact-" + buddy + "-imageCanvas").prop("width", imgWidth);
        $("#contact-" + buddy + "-imageCanvas").prop("height", imgHeight);
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
function OpenWindow(html, title, height, width, hideCloseButton, allowResize, button1_Text, button1_onClick, button2_Text, button2_onClick, DoOnLoad, OnClose) {
    console.log("Open Window: " + title);

    // Close any windows that may already be open
    try {
        windowsCollection.window("window").close();
    } catch (e) { }

    // Create Window
    var windowObj = windowsCollection.createWindow("window", 100, 0, width, height);
    windowObj.setText(title);
    if (allowResize) {
        windowObj.allowResize();
    } else {
        windowObj.denyResize();
    }
    windowObj.setModal(true);
    windowObj.button("park").hide();
    windowObj.button("park").disable();

    if (allowResize) {
        windowObj.button("minmax").show();
    } else {
        windowObj.button("minmax").hide();
    }

    if (hideCloseButton) {
        windowObj.button("close").hide();
        windowObj.button("close").disable();
    }

    windowObj.button("help").hide();
    windowObj.button("help").disable();

    windowObj.attachHTMLString(html);

    if(DoOnLoad)DoOnLoad();
    if(OnClose){
        windowObj.attachEvent("onClose", function(win){
            return OnClose(win);
        });
    }

    var windowWidth = $(window).outerWidth();
    var windowHeight = $(window).outerHeight();
    if(windowWidth <= width || windowHeight <= height){
        console.log("Window width is small, consider fullscreen");
        windowObj.allowResize();
        windowObj.maximize();
        windowObj.denyResize();
    }
    windowObj.center();

    var buttonHtml = "<div class=UiWindowButtonBar>";
    if(button1_Text) buttonHtml += "<button id=WindowButton1>"+ button1_Text +"</button>";
    if(button2_Text) buttonHtml += "<button id=WindowButton2>"+ button2_Text +"</button>";
    buttonHtml += "</div>"
    windowObj.attachStatusBar({text: buttonHtml});

    $("#WindowButton1").click(function () {
        console.log("Window Button 1 clicked");
        if (button1_onClick) button1_onClick();
    });
    $("#WindowButton2").click(function () {
        console.log("Window Button 2 clicked");
        if (button2_onClick) button2_onClick();
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
    html += "<div class=UiButtonBar><button id=AlertOkButton style=\"width:80px\">OK</button></div>";
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
    $("#ConfrimCancelButton").click(function () {
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
