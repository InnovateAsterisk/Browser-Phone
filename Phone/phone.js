/*

====================
 ☎️ Raspberry Phone ☎️ 
====================
A fully featured browser based WebRTC SIP phone for Asterisk
-------------------------------------------------------------
 Copyright (c) 2020  - Conrad de Wet - All Rights Reserved.
=============================================================
File: phone.js
License: GNU Lesser General Public License v3.0
Version: 0.0.2
Owner: Conrad de Wet
Date: April 2020
Git: https://github.com/InnovateAsterisk/Browser-Phone

=============
Dependencies:
=============
    ✅ Asterisk PBX (with WebRTC and Messaging)
    ✅ sip-0.11.6.js                        : WebRTC and SIP signalling library
    ✅ jquery-3.3.1.min.js                  : JavaScript toolkit
    ✅ jquery.md5-min.js                    : Md5 Hash plug-in (unused)
    ✅ Chart.bundle-2.7.2.js                : Graph and Chart UI
    ✅ dhtmlx.js                            : Windowing & UI Library
    ✅ fabric-2.4.6.min.js                  : Canvas Editing Library
    ✅ moment-with-locales-2.24.0.min.js    : Date & Time Library
    ✅ croppie.min.js                       : Profile Picture Crop Library
Note: These Libraries get loaded automatically.

=========================
Performance Improvements:
=========================
    ✅ Code Cleanup: namespace, objects, memory cleanup
    ✅ Hosted Tones and Audio files (commit to storage on apply)

=================================
Extended & Non-standard Features:
=================================
    ✅ Extended Services Send: Image, Recording, Video, FAX, SMS, Email
    ✅ Preview : File, Image, Video, YouTube, Audio

*/

// Global Settings
// ===============
var enabledExtendedServices = false;   // Send: Image, Recording, Video, SMS, Email
var enabledGroupServices = false;      // Group calling functionality - requires Asterisks config 
// Set the following to null to disable
var welcomeScreen = "<div class=\"UiWindowField scroller\"><pre style=\"font-size: 12px\">";
welcomeScreen += "===========================================================================\n";
welcomeScreen += "Copyright © 2020 - All Rights Reserved\n";
welcomeScreen += "===========================================================================\n";
welcomeScreen += "\n";
welcomeScreen += "                            NO WARRANTY\n";
welcomeScreen += "\n";
welcomeScreen += "BECAUSE THE PROGRAM IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY\n";
welcomeScreen += "FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN\n";
welcomeScreen += "OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES\n";
welcomeScreen += "PROVIDE THE PROGRAM \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED\n";
welcomeScreen += "OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF\n";
welcomeScreen += "MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS\n";
welcomeScreen += "TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE\n";
welcomeScreen += "PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING,\n";
welcomeScreen += "REPAIR OR CORRECTION.\n";
welcomeScreen += "\n";
welcomeScreen += "IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING\n";
welcomeScreen += "WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MAY MODIFY AND/OR\n";
welcomeScreen += "REDISTRIBUTE THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES,\n";
welcomeScreen += "INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING\n";
welcomeScreen += "OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED\n";
welcomeScreen += "TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY\n";
welcomeScreen += "YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER\n";
welcomeScreen += "PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE\n";
welcomeScreen += "POSSIBILITY OF SUCH DAMAGES.\n";
welcomeScreen += "\n";
welcomeScreen += "============================================================================\n</pre>";
welcomeScreen += "</div>";

// Rather don't fiddle with anything beyond this point
// -------------------------------------------------------------------------------------------------------------------------


// System variables
// ================
var localDB = window.localStorage;
var userAgent = null;
var voicemailSubs = null;
var BlfSubs = new Array();
var RemoteAudioMeters = new Array();
var LocalAudioMeters = new Array();
var CanvasCollection = new Array();
var Buddies = new Array();
var isReRegister = false;
var dhtmlxPopup = null;
var selectedBuddy = null;
var selectedLine = null;
var alertObj = null;
var confirmObj = null;
var promptObj = null;
var windowsCollection = null;
var messagingCollection = null;
var HasVideoDevice = false;
var HasAudioDevice = false;
var HasSpeakerDevice = false;
var AudioinputDevices = [];
var VideoinputDevices = [];
var SpeakerDevices = [];
var Lines = [];
var lang = {};

// User Settings & Defaults
// ========================
var wssServer = localDB.getItem("wssServer");           // eg: raspberrypi.local
var profileUserID = localDB.getItem("profileUserID");   // Internal reference ID. (DON'T CHANGE THIS!)
var profileUser = localDB.getItem("profileUser");       // eg: 100
var profileName = localDB.getItem("profileName");       // eg: Keyla James
var WebSocketPort = localDB.getItem("WebSocketPort");   // eg: 444 | 4443
var ServerPath = localDB.getItem("ServerPath");         // eg: /ws
var SipUsername = localDB.getItem("SipUsername");       // eg: webrtc
var SipPassword = localDB.getItem("SipPassword");       // eg: webrtc

var userAgentStr = getDbItem("UserAgentStr", "Raspberry Phone (SipJS - 0.11.6)");   // Set this to whatever you want.
var hostingPrefex = getDbItem("HostingPrefex", "");                                 // Use if hosting off root directiory. eg: "/phone/" or "/static/"

var AutoAnswerEnabled = (getDbItem("AutoAnswerEnabled", "0") == "1");       // Automatically answers the phone when the call comes in, if you are not on a call already
var DoNotDisturbEnabled = (getDbItem("DoNotDisturbEnabled", "0") == "1");   // Rejects any inbound call, while allowing outbound calls
var CallWaitingEnabled = (getDbItem("CallWaitingEnabled", "1") == "1");     // Rejects any inbound call if you are on a call already.
var RecordAllCalls = (getDbItem("RecordAllCalls", "0") == "1");             // Starts Call Recording when a call is established.

var AutoGainControl = (getDbItem("AutoGainControl", "1") == "1");       // Attempts to adjust the microphone volume to a good audio level. (OS may be better at this)
var EchoCancellation = (getDbItem("EchoCancellation", "1") == "1");     // Attemots to remove echo over the line.
var NoiseSuppression = (getDbItem("NoiseSuppression", "1") == "1");     // Attempts to clear the call qulity of noise.
var MirrorVideo = getDbItem("VideoOrientation", "rotateY(180deg)");     // Displays the self-preview in normal or mirror view, to better present the preview. 
var maxFrameRate = getDbItem("FrameRate", "");                          // Suggests a frame rate to your webcam if possible.
var videoHeight = getDbItem("VideoHeight", "");                         // Suggests a video height (and therefor picture quality) to your webcam.
var videoAspectRatio = getDbItem("AspectRatio", "");                    // Suggests an aspect ratio (1:1 | 4:3 | 16:9) to your webcam.
var NotificationsActive = (getDbItem("Notifications", "0") == "1");

var StreamBuffer = parseInt(getDbItem("StreamBuffer", 50));                 // The amount of rows to buffer in the Buddy Stream
var PosterJpegQuality = parseFloat(getDbItem("PosterJpegQuality", 0.6));    // The image quality of the Video Poster images
var VideoResampleSize = getDbItem("VideoResampleSize", "HD");               // The resample size (height) to re-render video that gets presented (sent). (SD = ???x360 | HD = ???x720 | FHD = ???x1080)
var RecordingVideoSize = getDbItem("RecordingVideoSize", "HD");             // The size/quality of the video track in the recodings (SD = 640x360 | HD = 1280x720 | FHD = 1920x1080)
var RecordingVideoFps = parseInt(getDbItem("RecordingVideoFps", 12));       // The Frame Per Second of the Video Track recording
var RecordingLayout = getDbItem("RecordingLayout", "them-pnp");         // The Layout of the Recording Video Track (side-by-side | us-pnp | them-pnp | us-only | them-only)

var DidLength = parseInt(getDbItem("DidLength", 6));                 // DID length from which to decide if an incoming caller is a "contact" or an "extension".
var MaxDidLength = parseInt(getDbItem("maximumNumberLength", 16));   // Maximum langth of any DID number including international dialled numbers.

// Permission Settings
var EnableTransfer = (getDbItem("EnableTransfer", "1") == "1");                         // Controls Transfering during a call
var EnableConference = (getDbItem("EnableConference", "1") == "1");                     // Controls Conference during a call
var AutoAnswerPolicy = getDbItem("AutoAnswerPolicy", "allow");                          // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
var DoNotDisturbPolicy = getDbItem("DoNotDisturbPolicy", "allow");                      // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
var CallWaitingPolicy = getDbItem("CallWaitingPolicy", "allow");                        // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
var CallRecordingPolicy = getDbItem("CallRecordingPolicy", "allow");                    // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
var EnableAccountSettings = (getDbItem("EnableAccountSettings", "1") == "1");           // Controls the Account tab in Settings
var EnableAudioVideoSettings = (getDbItem("EnableAudioVideoSettings", "1") == "1");     // Controls the Audio & Video tab in Settings
var EnableAppearanceSettings = (getDbItem("EnableAppearanceSettings", "1") == "1");     // Controls the Appearance tab in Settings
var EnableNotificationSettings = (getDbItem("EnableNotificationSettings", "1") == "1"); // Controls the Notifications tab in Settings

// Upgrade Pataches
// ================
// Version: 0.0.1 => Version: 0.0.2
var oldUserBuddies = localDB.getItem("UserBuddiesJson");
if(oldUserBuddies != null && profileUserID != null) {
    localDB.setItem(profileUserID + "-Buddies", oldUserBuddies);
    localDB.removeItem("UserBuddiesJson");
}
oldUserBuddies = null;

// Utilities
// =========
function uID(){
    return Date.now()+Math.floor(Math.random()*10000).toString(16).toUpperCase();
}
function utcDateNow(){
    return moment().utc().format("YYYY-MM-DD HH:mm:ss UTC");
}
function getDbItem(itemIndex, defaultValue){
    if(localDB.getItem(itemIndex) != null) return localDB.getItem(itemIndex);
    return defaultValue;
}
function getAudioSrcID(){
    var id = localDB.getItem("AudioSrcId");
    return (id != null)? id : "default";
}
function getAudioOutputID(){
    var id = localDB.getItem("AudioOutputId");
    return (id != null)? id : "default";
}
function getVideoSrcID(){
    var id = localDB.getItem("VideoSrcId");
    return (id != null)? id : "default";
}
function getRingerOutputID(){
    var id = localDB.getItem("RingerOutputId");
    return (id != null)? id : "default";
}
function formatDuration(seconds){
    var sec = Math.floor(parseFloat(seconds));
    if(sec < 0){
        return sec;
    } 
    else if(sec >= 0 && sec < 60){
        return sec + " " + ((sec > 1) ? lang.seconds_plural : lang.second_single);
    } 
    else if(sec >= 60 && sec < 60 * 60){ // greater then a minute and less then an hour
        var duration = moment.duration(sec, 'seconds');
        return duration.minutes() + " "+ ((duration.minutes() > 1) ? lang.minutes_plural: lang.minute_single) +" " + duration.seconds() +" "+ ((duration.seconds() > 1) ? lang.seconds_plural : lang.second_single);
    } 
    else if(sec >= 60 * 60 && sec < 24 * 60 * 60){ // greater than an hour and less then a day
        var duration = moment.duration(sec, 'seconds');
        return duration.hours() + " "+ ((duration.hours() > 1) ? lang.hours_plural : lang.hour_single) +" " + duration.minutes() + " "+ ((duration.minutes() > 1) ? lang.minutes_plural: lang.minute_single) +" " + duration.seconds() +" "+ ((duration.seconds() > 1) ? lang.seconds_plural : lang.second_single);
    } 
    //  Otherwise.. this is just too long
}
function formatShortDuration(seconds){
    var sec = Math.floor(parseFloat(seconds));
    if(sec < 0){
        return sec;
    } 
    else if(sec >= 0 && sec < 60){
        return "00:"+ ((sec > 9)? sec : "0"+sec );
    } 
    else if(sec >= 60 && sec < 60 * 60){ // greater then a minute and less then an hour
        var duration = moment.duration(sec, 'seconds');
        return ((duration.minutes() > 9)? duration.minutes() : "0"+duration.minutes()) + ":" + ((duration.seconds() > 9)? duration.seconds() : "0"+duration.seconds());
    } 
    else if(sec >= 60 * 60 && sec < 24 * 60 * 60){ // greater than an hour and less then a day
        var duration = moment.duration(sec, 'seconds');
        return ((duration.hours() > 9)? duration.hours() : "0"+duration.hours())  + ":" + ((duration.minutes() > 9)? duration.minutes() : "0"+duration.minutes())  + ":" + ((duration.seconds() > 9)? duration.seconds() : "0"+duration.seconds());
    } 
    //  Otherwise.. this is just too long
}
function formatBytes(bytes, decimals=2) {
    if (bytes === 0) return "0 "+ lang.bytes;
    var k = 1024;
    var dm = decimals < 0 ? 0 : decimals;
    var sizes = [lang.bytes, lang.kb, lang.mb, lang.gb, lang.tb, lang.pb, lang.eb, lang.zb, lang.yb];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function UserLocale(){
    var language = window.navigator.userLanguage || window.navigator.language; // "en", "en-US", "fr", "fr-FR", "es-ES", etc.
    language = language.toLowerCase();
    if(language.indexOf("-") > -1){
        return language.split("-")[1];
    } 
    else {
        return language;
    }
}
function getFilter(filter, keyword){
    if(filter.indexOf(",", filter.indexOf(keyword +": ") + keyword.length + 2) != -1){
        return filter.substring(filter.indexOf(keyword +": ") + keyword.length + 2, filter.indexOf(",", filter.indexOf(keyword +": ") + keyword.length + 2));
    }
    else {
        return filter.substring(filter.indexOf(keyword +": ") + keyword.length + 2);
    }
}
function base64toBlob(base64Data, contentType) {
    if(base64Data.indexOf("," != -1)) base64Data = base64Data.split(",")[1]; // [data:image/png;base64] , [xxx...]
    var byteCharacters = atob(base64Data);
    var slicesCount = Math.ceil(byteCharacters.length / 1024);
    var byteArrays = new Array(slicesCount);
    for (var s = 0; s < slicesCount; ++s) {
        var begin = s * 1024;
        var end = Math.min(begin + 1024, byteCharacters.length);
        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[s] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
}
function MakeDataArray(defaultValue, count){
    var rtnArray = new Array(count);
    for(var i=0; i< rtnArray.length; i++) {
        rtnArray[i] = defaultValue;
    }
    return rtnArray;
}

// Window and Document Events
// ==========================
$(window).on("beforeunload", function() {
    Unregister();
});
$(window).on("resize", function() {
    UpdateUI();
});

// User Interface
// ==============
function UpdateUI(){
    var windowWidth = $(window).outerWidth();
    if(windowWidth < 920){
        // Narrow Layout
        if(selectedBuddy == null & selectedLine == null) {
            // Nobody Selected
            $("#rightContent").hide();

            $("#leftContent").css("width", "100%");
            $("#leftContent").show();
        }
        else {
            $("#rightContent").css("margin-left", "0px");
            $("#rightContent").show();

            $("#leftContent").hide();
            
            if(selectedBuddy != null) updateScroll(selectedBuddy.identity);
        }
    }
    else {
        // Wide Screen Layout
        if(selectedBuddy == null & selectedLine == null) {
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

            if(selectedBuddy != null) updateScroll(selectedBuddy.identity);
        }
    }
    HidePopup();
}

// UI Windows
// ==========
function AddSomeoneWindow(numberStr){
    HidePopup();

    var html = "<div border=0 class='UiWindowField scroller'>";

    html += "<div class=UiText>"+ lang.full_name +":</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='"+ lang.eg_full_name +"'></div>";

    html += "<div class=UiText>"+ lang.title_description +":</div>";
    html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"'></div>";

    html += "<div class=UiText>"+ lang.internal_subscribe_extension +":</div>";
    if(numberStr && numberStr.length > 1 && numberStr.length < DidLength && numberStr.substring(0,1) != "*"){
        html += "<div><input id=AddSomeone_Exten class=UiInputText type=text value="+ numberStr +" placeholder='"+ lang.eg_internal_subscribe_extension +"'></div>";
    } 
    else{
        html += "<div><input id=AddSomeone_Exten class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"'></div>";
    }

    html += "<div class=UiText>"+ lang.mobile_number +":</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=text placeholder='"+ lang.eg_mobile_number +"'></div>";

    html += "<div class=UiText>"+ lang.email +":</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=text placeholder='"+ lang.eg_email +"'></div>";

    html += "<div class=UiText>"+ lang.contact_number_1 +":</div>";
    if(numberStr && numberStr.length > 1){
        html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text value="+ numberStr +" placeholder='"+ lang.eg_contact_number_1 +"'></div>";
    }
    else {
        html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_1 +"'></div>";
    }

    html += "<div class=UiText>"+ lang.contact_number_2 +":</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_2 +"'></div>";
    html += "</div>"
    OpenWindow(html, lang.add_someone, 480, 640, false, true, lang.add, function(){

        // Add Contact / Extension
        var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
        if(json == null) json = InitUserBuddies();

        if($("#AddSomeone_Exten").val() == ""){
            // Add Regular Contact
            var id = uID();
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
            var buddyObj = new Buddy("contact", id, $("#AddSomeone_Name").val(), "", $("#AddSomeone_Mobile").val(), $("#AddSomeone_Num1").val(), $("#AddSomeone_Num2").val(), dateNow, $("#AddSomeone_Desc").val(), $("#AddSomeone_Email").val());
            AddBuddy(buddyObj, false, false);
        }
        else {
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
            var buddyObj = new Buddy("extension", id, $("#AddSomeone_Name").val(), $("#AddSomeone_Exten").val(), $("#AddSomeone_Mobile").val(), $("#AddSomeone_Num1").val(), $("#AddSomeone_Num2").val(), dateNow, $("#AddSomeone_Desc").val(), $("#AddSomeone_Email").val());
            AddBuddy(buddyObj, false, false, true);
        }
        // Update Size: 
        json.TotalRows = json.DataCollection.length;

        // Save To DB
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

        UpdateBuddyList();

        CloseWindow();
    }, lang.cancel, function(){
        CloseWindow();
    });
}
function CreateGroupWindow(){
    HidePopup();

    OpenWindow("", lang.create_group, 480, 640, false, true, null, function(){

        // Create Group

        CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    })
}
function ConfigureExtensionWindow(){
    HidePopup();

    OpenWindow("...", lang.configure_extension , 480, 640, false, true, lang.save, function(){

        // 1 Account
        if(localDB.getItem("profileUserID") == null) localDB.setItem("profileUserID", uID()); // For first time only
        localDB.setItem("wssServer", $("#Configure_Account_wssServer").val());
        localDB.setItem("WebSocketPort", $("#Configure_Account_WebSocketPort").val());
        localDB.setItem("ServerPath", $("#Configure_Account_ServerPath").val());
        localDB.setItem("profileUser", $("#Configure_Account_profileUser").val());
        localDB.setItem("profileName", $("#Configure_Account_profileName").val());
        localDB.setItem("SipUsername", $("#Configure_Account_SipUsername").val());
        localDB.setItem("SipPassword", $("#Configure_Account_SipPassword").val());

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

        Alert(lang.alert_settings, lang.reload_required, function(){
            window.location.reload();
        });

        // CloseWindow();
    }, lang.cancel, function(){
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
        }
        catch(e){}

        try{
            var tracks = window.SettingsMicrophoneStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        }
        catch(e){}
        window.SettingsMicrophoneStream = null;

        try{
            var soundMeter = window.SettingsMicrophoneSoundMeter;
            soundMeter.stop();
        }
        catch(e){}   
        window.SettingsMicrophoneSoundMeter = null;
        
        try{
            window.SettingsOutputAudio.pause();
        }
        catch(e){}
        window.SettingsOutputAudio = null;

        try{
            var tracks = window.SettingsOutputStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        }
        catch(e){}
        window.SettingsOutputStream = null;

        try{
            var soundMeter = window.SettingsOutputStreamMeter;
            soundMeter.stop();
        }
        catch(e){}
        window.SettingsOutputStreamMeter = null;

        return true;
    });

    // Write HTML to Tabs
    var windowObj = windowsCollection.window("window");
    var ConfigureTabbar = windowObj.attachTabbar({ 
        tabs: [
            { id: "1", text: lang.account, active:  true },
            { id: "2", text: lang.audio_video, active:  false },
            { id: "3", text: lang.appearance, active:  false },
            { id: "4", text: lang.notifications , active:  false }
        ]
    });
    if(EnableAccountSettings == false) ConfigureTabbar.tabs("1").disable();
    if(EnableAudioVideoSettings == false) ConfigureTabbar.tabs("2").disable();
    if(EnableAppearanceSettings == false) ConfigureTabbar.tabs("3").disable();
    if(EnableNotificationSettings == false) ConfigureTabbar.tabs("4").disable();

    // 1 Account 
    // ==================================================================================
    var AccountHtml =  "<div class=\"UiWindowField scroller\">";
    AccountHtml += "<div class=UiText>"+ lang.asterisk_server_address +":</div>";
    AccountHtml += "<div><input id=Configure_Account_wssServer class=UiInputText type=text placeholder='"+ lang.eg_asterisk_server_address +"' value='"+ getDbItem("wssServer", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.websocket_port +":</div>";
    AccountHtml += "<div><input id=Configure_Account_WebSocketPort class=UiInputText type=text placeholder='"+ lang.eg_websocket_port +"' value='"+ getDbItem("WebSocketPort", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.websocket_path +":</div>";
    AccountHtml += "<div><input id=Configure_Account_ServerPath class=UiInputText type=text placeholder='"+ lang.eg_websocket_path +"' value='"+ getDbItem("ServerPath", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.internal_subscribe_extension +":</div>";
    AccountHtml += "<div><input id=Configure_Account_profileUser class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"' value='"+ getDbItem("profileUser", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.full_name +":</div>";
    AccountHtml += "<div><input id=Configure_Account_profileName class=UiInputText type=text placeholder='"+ lang.eg_full_name +"' value='"+ getDbItem("profileName", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.sip_username +":</div>";
    AccountHtml += "<div><input id=Configure_Account_SipUsername class=UiInputText type=text placeholder='"+ lang.eg_sip_username +"' value='"+ getDbItem("SipUsername", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.sip_password +":</div>";
    AccountHtml += "<div><input id=Configure_Account_SipPassword class=UiInputText type=password placeholder='"+ lang.eg_sip_password +"' value='"+ getDbItem("SipPassword", "") +"'></div>";
    AccountHtml += "<br><br></div>";

    ConfigureTabbar.tabs("1").attachHTMLString(AccountHtml);

    // 2 Audio & Video
    // ==================================================================================
    var AudioVideoHtml = "<div class=\"UiWindowField scroller\">";

    AudioVideoHtml += "<div class=UiText>"+ lang.speaker +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=playbackSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_SpeakerOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><button class=on_white id=preview_output_play><i class=\"fa fa-play\"></i></button></div>";

    AudioVideoHtml += "<div class=UiText>"+ lang.microphone +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=microphoneSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_MicrophoneOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_AutoGainControl><label for=Settings_AutoGainControl> "+ lang.auto_gain_control +"<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_EchoCancellation><label for=Settings_EchoCancellation> "+ lang.echo_cancellation +"<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_NoiseSuppression><label for=Settings_NoiseSuppression> "+ lang.noise_suppression +"<label></div>";

    AudioVideoHtml += "<div class=UiText>"+ lang.camera +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=previewVideoSrc style=\"width:100%\"></select></div>";

    AudioVideoHtml += "<div class=UiText>"+ lang.frame_rate +":</div>"
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

    AudioVideoHtml += "<div class=UiText>"+ lang.quality +":</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_Quality id=r30 type=radio value=\"160\"><label class=radio_pill for=r30><i class=\"fa fa-video-camera\" style=\"transform: scale(0.4)\"></i> HQVGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r31 type=radio value=\"240\"><label class=radio_pill for=r31><i class=\"fa fa-video-camera\" style=\"transform: scale(0.6)\"></i> QVGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r32 type=radio value=\"480\"><label class=radio_pill for=r32><i class=\"fa fa-video-camera\" style=\"transform: scale(0.8)\"></i> VGA</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r33 type=radio value=\"720\"><label class=radio_pill for=r33><i class=\"fa fa-video-camera\" style=\"transform: scale(1)\"></i> HD</label>";
    AudioVideoHtml += "<input name=Settings_Quality id=r34 type=radio value=\"\"><label class=radio_pill for=r34><i class=\"fa fa-trash\"></i></label>";
    AudioVideoHtml += "</div>";
    
    AudioVideoHtml += "<div class=UiText>"+ lang.image_orientation +":</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_Oriteation id=r20 type=radio value=\"rotateY(0deg)\"><label class=radio_pill for=r20><i class=\"fa fa-address-card\" style=\"transform: rotateY(0deg)\"></i> Normal</label>";
    AudioVideoHtml += "<input name=Settings_Oriteation id=r21 type=radio value=\"rotateY(180deg)\"><label class=radio_pill for=r21><i class=\"fa fa-address-card\" style=\"transform: rotateY(180deg)\"></i> Mirror</label>";
    AudioVideoHtml += "</div>";

    AudioVideoHtml += "<div class=UiText>"+ lang.aspect_ratio +":</div>";
    AudioVideoHtml += "<div class=pill-nav>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r10 type=radio value=\"1\"><label class=radio_pill for=r10><i class=\"fa fa-square-o\" style=\"transform: scaleX(1); margin-left: 7px; margin-right: 7px\"></i> 1:1</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r11 type=radio value=\"1.33\"><label class=radio_pill for=r11><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.33); margin-left: 5px; margin-right: 5px;\"></i> 4:3</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r12 type=radio value=\"1.77\"><label class=radio_pill for=r12><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.77); margin-right: 3px;\"></i> 16:9</label>";
    AudioVideoHtml += "<input name=Settings_AspectRatio id=r13 type=radio value=\"\"><label class=radio_pill for=r13><i class=\"fa fa-trash\"></i></label>";
    AudioVideoHtml += "</div>";
    
    AudioVideoHtml += "<div class=UiText>"+ lang.preview +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center; margin-top:10px\"><video id=local-video-preview class=previewVideo></video></div>";

    // TODO
    // AudioVideoHtml += "<div class=UiText>"+ lang.ringtone +":</div>";
    // AudioVideoHtml += "<div style=\"text-align:center\"><select id=ringTone style=\"width:100%\"></select></div>";
    // AudioVideoHtml += "<div>Play</div>";

    AudioVideoHtml += "<div id=RingDeviceSection>";
    AudioVideoHtml += "<div class=UiText>"+ lang.ring_device +":</div>";
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
                Alert(lang.alert_error_user_media, lang.error);
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
                Alert(lang.alert_error_user_media, lang.error);
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
                Alert(lang.alert_error_user_media, lang.error);
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
        }
        catch(e){}

        try{
            soundMeter = window.SettingsMicrophoneSoundMeter;
            soundMeter.stop();
            window.SettingsMicrophoneSoundMeter = null;
        }
        catch(e){}

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
                    console.log("sinkId applied to audioObj:", this.value);
                }).catch(function(e){
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
        }
    });

    // play button press
    playButton.click(function(){

        try{
            window.SettingsOutputAudio.pause();
        } 
        catch(e){}
        window.SettingsOutputAudio = null;

        try{
            var tracks = window.SettingsOutputStream.getTracks();
            tracks.forEach(function(track) {
                track.stop();
            });
        }
        catch(e){}
        window.SettingsOutputStream = null;

        try{
            var soundMeter = window.SettingsOutputStreamMeter;
            soundMeter.stop();
        }
        catch(e){}
        window.SettingsOutputStreamMeter = null;

        // Load Sample
        var audioObj = new Audio(hostingPrefex + "speech_orig.mp3"); //speech_orig.wav: this file failes to play using the Asteriks MiniServer
        audioObj.onplay = function(){
            var outputStream = new MediaStream();
            if (typeof audioObj.captureStream !== 'undefined') {
                outputStream = audioObj.captureStream();
            } 
            else if (typeof audioObj.mozCaptureStream !== 'undefined') {
                return;
                // BUG: mozCaptureStream() in Firefox does not work the same way as captureStream()
                // the actual sound does not play out to the speakers... its as if the mozCaptureStream
                // removes the stream from the <audio> object.
                outputStream = audioObj.mozCaptureStream();
            }
            else if (typeof audioObj.webkitCaptureStream !== 'undefined') {
                outputStream = audioObj.webkitCaptureStream();
            }
            else {
                console.warn("Cannot display Audio Levels")
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
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
            // Play
            audioObj.play().then(function(){
                // Audio Is Playing
            }).catch(function(e){
                console.warn("Unable to play audio file", e);
            });
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
                Alert(lang.alert_error_user_media, lang.error);
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
                console.log("Found Device ("+ deviceInfos[i].kind +"): ", deviceInfos[i].label);

                // Check Devices
                if (deviceInfos[i].kind === "audioinput") {
                    MicrophoneFound = true;
                    if(savedAudioDevice != "default" && deviceInfos[i].deviceId == savedAudioDevice) {
                        audioDeviceFound = true;
                    }                   
                }
                else if (deviceInfos[i].kind === "audiooutput") {
                    SpeakerFound = true;
                }
                else if (deviceInfos[i].kind === "videoinput") {
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
                }
                else {
                    Alert("No video / webcam devices found, make sure one is plugged in.", "Device Error");
                }

                // Handle Audio
                var audioTrack = (mediaStream.getAudioTracks().length >= 1)? mediaStream.getAudioTracks()[0] : null ;
                if(MicrophoneFound && audioTrack != null){
                    localMicrophoneStream.addTrack(audioTrack);
                    // Display Micrphone Levels
                    window.SettingsMicrophoneStream = localMicrophoneStream;
                    window.SettingsMicrophoneSoundMeter = MeterSettingsOutput(localMicrophoneStream, "Settings_MicrophoneOutput", "width", 50);
                }
                else {
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
                    }
                    else if (deviceInfo.kind === "audiooutput") {
                        option.text((DisplayName != "")? DisplayName : "Speaker");
                        if(getAudioOutputID() == devideId) option.prop("selected", true);
                        selectAudioScr.append(option);
                        selectRingDevice.append(option.clone());
                    }
                    else if (deviceInfo.kind === "videoinput") {
                        if(getVideoSrcID() == devideId) option.prop("selected", true);
                        option.text((DisplayName != "")? DisplayName : "Webcam");
                        selectVideoScr.append(option);
                    }
                }
            }).catch(function(e){
                console.error(e);
                Alert(lang.alert_error_user_media, lang.error);
            });
        }).catch(function(e){
            console.error("Error getting Media Devices", e);
        });
    }
    else {
        Alert(lang.alert_media_devices, lang.error);
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
                Alert(lang.alert_file_size, lang.error);
            }
        }
        else {
            Alert(lang.alert_single_file, lang.error);
        }
    });

    // 4 Notifications
    // ==================================================================================
    var NotificationsHtml = "<div class=\"UiWindowField scroller\">";
    NotificationsHtml += "<div class=UiText>"+ lang.notifications +":</div>";
    NotificationsHtml += "<div><input type=checkbox id=Settings_Notifications><label for=Settings_Notifications> "+ lang.enable_onscreen_notifications +"<label></div>";
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
                }
                else {
                    Notification.requestPermission(function(p){
                        console.log(p);
                        HandleNotifyPermission(p)
                    });
                }
            }
        }
    });

}
function checkNotificationPromise() {
    try {
        Notification.requestPermission().then();
    }
    catch(e) {
        return false;
    }
    return true;
}
function HandleNotifyPermission(p){
    if(p == "granted") {
        // Good
    }
    else {
        Alert(lang.alert_notification_permission, lang.permission, function(){
            console.log("Attempting to uncheck the checkbox...");
            $("#Settings_Notifications").prop("checked", false);
        });
    }
}
function EditBuddyWindow(buddy){
    try{
        dhtmlxPopup.hide();
    }
    catch(e){}

    var buddyObj = null;
    var itemId = -1;
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    $.each(json.DataCollection, function (i, item) {
        if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
            buddyObj = item;
            itemId = i;
            return false;
        }
    });

    if(buddyObj == null){
        Alert(lang.alert_not_found, lang.error);
        return;
    }
    
    var cropper;
    
    var html = "<div border=0 class='UiWindowField scroller'>";

    html += "<div id=ImageCanvas style=\"width:150px; height:150px\"></div>";
    html += "<div style=\"float:left; margin-left:200px;\"><input id=fileUploader type=file></div>";
    html += "<div style=\"margin-top: 50px\"></div>";
    
    html += "<div class=UiText>"+ lang.full_name +":</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='"+ lang.eg_full_name +"' value='"+ ((buddyObj.DisplayName && buddyObj.DisplayName != "null" && buddyObj.DisplayName != "undefined")? buddyObj.DisplayName : "") +"'></div>";

    html += "<div class=UiText>"+ lang.title_description +":</div>";
    if(buddyObj.Type == "extension"){
        html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"' value='"+ ((buddyObj.Position && buddyObj.Position != "null" && buddyObj.Position != "undefined")? buddyObj.Position : "") +"'></div>";
    }
    else {
        html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"' value='"+ ((buddyObj.Description && buddyObj.Description != "null" && buddyObj.Description != "undefined")? buddyObj.Description : "") +"'></div>";
    }
    html += "<div class=UiText>"+ lang.mobile_number +":</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=text placeholder='"+ lang.eg_mobile_number +"' value='"+ ((buddyObj.MobileNumber && buddyObj.MobileNumber != "null" && buddyObj.MobileNumber != "undefined")? buddyObj.MobileNumber : "") +"'></div>";

    html += "<div class=UiText>"+ lang.email +":</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=text placeholder='"+ lang.email +"' value='"+ ((buddyObj.Email && buddyObj.Email != "null" && buddyObj.Email != "undefined")? buddyObj.Email : "") +"'></div>";

    html += "<div class=UiText>"+ lang.contact_number_1 +":</div>";
    html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_1 +"' value='"+((buddyObj.ContactNumber1 && buddyObj.ContactNumber1 != "null" && buddyObj.ContactNumber1 != "undefined")? buddyObj.ContactNumber1 : "") +"'></div>";

    html += "<div class=UiText>"+ lang.contact_number_2 +":</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_2 +"' value='"+ ((buddyObj.ContactNumber2 && buddyObj.ContactNumber2 != "null" && buddyObj.ContactNumber2 != "undefined")? buddyObj.ContactNumber2 : "") +"'></div>";
    html += "</div>"
    OpenWindow(html, lang.edit, 480, 640, false, true, lang.save, function(){

        buddyObj.LastActivity = utcDateNow();
        buddyObj.DisplayName = $("#AddSomeone_Name").val();
        if(buddyObj.Type == "extension"){
            buddyObj.Position = $("#AddSomeone_Desc").val();
        }
        else {
            buddyObj.Description = $("#AddSomeone_Desc").val();
        }
        buddyObj.MobileNumber = $("#AddSomeone_Mobile").val();
        buddyObj.Email = $("#AddSomeone_Email").val();
        buddyObj.ContactNumber1 = $("#AddSomeone_Num1").val();
        buddyObj.ContactNumber2 = $("#AddSomeone_Num2").val();

        // Update Image
        var constraints = { type: 'base64', size: 'viewport', format: 'png', quality: 1, circle: false }
        $("#ImageCanvas").croppie('result', constraints).then(function(base64) {
            if(buddyObj.Type == "extension"){
                localDB.setItem("img-"+ buddyObj.uID +"-extension", base64);
            }
            else if(buddyObj.Type == "contact") {
                localDB.setItem("img-"+ buddyObj.cID +"-contact", base64);
            }
            else if(buddyObj.Type == "group") {
                localDB.setItem("img-"+ buddyObj.gID +"-group", base64);
            }
            // Update
            UpdateBuddyList();
        });

        // Update: 
        json.DataCollection[itemId] = buddyObj;

        // Save To DB
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

        // Update the Memory Array, so that the UpdateBuddyList can make the changes
        for(var b = 0; b < Buddies.length; b++)
        {
            if(buddyObj.Type == "extension"){
                if(buddyObj.uID == Buddies[b].identity){
                    Buddies[b].CallerIDName = buddyObj.DisplayName;
                    Buddies[b].Desc = buddyObj.Position;
                }                
            }
            else if(buddyObj.Type == "contact") {
                if(buddyObj.cID == Buddies[b].identity){
                    Buddies[b].CallerIDName = buddyObj.DisplayName;
                    Buddies[b].Desc = buddyObj.Description;
                }                
            }
            else if(buddyObj.Type == "group") {
                
            }
        }

        CloseWindow();
    }, lang.cancel, function(){
        CloseWindow();
    }, function(){
        // DoOnLoad
        cropper = $("#ImageCanvas").croppie({
            viewport: { width: 150, height: 150, type: 'circle' }
        });

        // Preview Existing Image
        if(buddyObj.Type == "extension"){
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyObj.uID, "extension") }).then();
        }
        else if(buddyObj.Type == "contact") {
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyObj.cID, "contact") }).then();
        }
        else if(buddyObj.Type == "group") {
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
                    }
                    reader.readAsDataURL(fileObj);
                }
                else {
                    Alert(lang.alert_file_size, lang.error);
                }
            }
            else {
                Alert(lang.alert_single_file, lang.error);
            }
        });

    });
}

// Document Ready
// ==============
$(document).ready(function () {
    // Load Langauge File
    // ==================
    var userLang = navigator.language || navigator.userLanguage;
    userLang = userLang.split('-')[0].toLowerCase();
    // userLang = "ch"; // <- testing override
    $.getJSON(hostingPrefex + "en.json", function (data){
        lang = data;
        if(userLang != "en"){
            $.getJSON(hostingPrefex + userLang +".json", function (altdata){
                lang = altdata;
            }).always(function() {
                console.log("Lanaguage Pack Loaded: ", lang);
                InitUi();
            });
        }
        else {
            console.log("Lanaguage Pack Loaded: ", lang);
            InitUi();
        }
    });
});

// Init UI
// =======
function InitUi(){

    var phone = $("#Phone");
    phone.empty();
    phone.attr("class", "pageContainer");

    // Left Section
    var leftSection = $("<div>");
    leftSection.attr("id", "leftContent");
    leftSection.attr("style", "float:left; height: 100%; width:320px");

    var leftHTML = "<table style=\"height:100%; width:100%\" cellspacing=5 cellpadding=0>";
    leftHTML += "<tr><td class=streamSection style=\"height: 77px\">";
    // Profile User
    leftHTML += "<div class=contact id=UserProfile style=\"margin-bottom:5px; display: inline-block;\">";
    leftHTML += "<div id=UserProfilePic class=buddyIcon></div>";
    leftHTML += "<span id=reglink class=dotOffline></span>";
    leftHTML += "<span id=dereglink class=dotOnline style=\"display:none\"><i class=\"fa fa-wifi\" style=\"line-height: 14px; text-align: center; display: block;\"></i></span>";
    leftHTML += "<span id=WebRtcFailed class=dotFailed style=\"display:none\"><i class=\"fa fa-cross\" style=\"line-height: 14px; text-align: center; display: block;\"></i></span>";
    leftHTML += "<div class=contactNameText><i class=\"fa fa-phone-square\"></i> <span id=UserDID></span> - <span id=UserCallID></span></div>";
    leftHTML += "<div id=regStatus class=presenceText>&nbsp;</div>";
    leftHTML += "</div>";
    // Search / Add Buddies
    leftHTML += "<div>";
    leftHTML += "<span class=searchClean><INPUT id=txtFindBuddy type=text autocomplete=none style=\"width:160px;\"></span>";
    leftHTML += "&nbsp;";
    leftHTML += "<button id=BtnFreeDial><i class=\"fa fa-phone\"></i></button>";
    leftHTML += "<button id=BtnAddSomeone><i class=\"fa fa-user-plus\"></i></button>";
    leftHTML += "<button id=BtnCreateGroup><i class=\"fa fa-users\"></i><i class=\"fa fa-plus\" style=\"font-size:9px\"></i></button>";
    leftHTML += "</div>";
    leftHTML += "</td></tr>";
    // Lines & Buddies
    leftHTML += "<tr><td class=streamSection><div id=myContacts class=\"contactArea cleanScroller\"></div></td></tr>";
    leftHTML += "</table>";

    leftSection.html(leftHTML);
    
    // Right Section
    var rightSection = $("<div>");
    rightSection.attr("id", "rightContent");
    rightSection.attr("style", "margin-left: 320px; height: 100%");

    phone.append(leftSection);
    phone.append(rightSection);

    // Setup Windows
    windowsCollection = new dhtmlXWindows("material");
    messagingCollection = new dhtmlXWindows("material");

    if(enabledGroupServices == false) $("#BtnCreateGroup").hide();

    $("#UserDID").html(profileUser);
    $("#UserCallID").html(profileName);
    $("#UserProfilePic").css("background-image", "url('"+ getPicture("profilePicture") +"')");
    
    $("#txtFindBuddy").attr("placeholder", lang.find_someone)
    $("#txtFindBuddy").on('keyup', function(event){
        UpdateBuddyList();
    });
    $("#BtnFreeDial").attr("title", lang.call)
    $("#BtnFreeDial").on('click', function(event){
        ShowDial(this);
    });
    $("#BtnAddSomeone").attr("title", lang.add_someone)
    $("#BtnAddSomeone").on('click', function(event){
        AddSomeoneWindow();
    });
    $("#BtnCreateGroup").attr("title", lang.create_group)
    $("#BtnCreateGroup").on('click', function(event){
        CreateGroupWindow();
    });
    $("#UserProfile").on('click', function(event){
        ShowMyProfileMenu(this);
    });
    
    UpdateUI();
    
    // Check if you account is created
    if(profileUserID == null ){
        ConfigureExtensionWindow();
        return; // Don't load any more, after applying settings, the page must reload.
    }

    PopulateBuddyList();

    // Select Last user
    if(localDB.getItem("SelectedBuddy") != null){
        console.log("Selecting previously selected buddy...", localDB.getItem("SelectedBuddy"));
        SelectBuddy(localDB.getItem("SelectedBuddy"));
    }

    // Show Welcome Screen
    if(welcomeScreen){
        if(localDB.getItem("WelcomeScreenAccept") != "yes"){
            OpenWindow(welcomeScreen, lang.welcome, 480, 800, true, false, lang.accept, function(){
                localDB.setItem("WelcomeScreenAccept", "yes");
                CloseWindow();
            }, null, null, null, null);
        }
    }

    CreateUserAgent()
}

// Create User Agent
// =================
function CreateUserAgent() {
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
            hackIpInContact: true, // makes the contact field up from a random ip address (as it porbably doesnt know its own ip at this point... why would it)
            userAgentString: userAgentStr,
            keepAliveInterval: 59,
            autostart: false,
            register: false,
        });
        console.log("Creating User Agent... Done");
    }
    catch (e) {
        console.error("Error creating User Agent: "+ e);
        $("#regStatus").html(lang.error_user_agant);
        alert(e.message);
        return;
    }

    // UA Register events
    userAgent.on('registered', function () {
        console.log("Registered!");
        $("#regStatus").html(lang.registered);

        $("#reglink").hide();
        $("#dereglink").show();

        // Start Subscribe Loop
        if(!isReRegister) {
            SubscribeAll();
        }
        isReRegister = true;
    });
    userAgent.on('registrationFailed', function (cause) {
        console.log("Registration Failed: " + cause);
        $("#regStatus").html(lang.registration_failed);

        $("#reglink").show();
        $("#dereglink").hide();
    });
    userAgent.on('unregistered', function () {
        console.log("Unregistered, bye!");
        $("#regStatus").html(lang.unregistered);

        $("#reglink").show();
        $("#dereglink").hide();
    });

    // UA transport
    userAgent.on('transportCreated', function (transport) {
        console.log("Transport Object Created");
        
        // Transport Events
        transport.on('connected', function () {
            console.log("Connected to Web Socket!");
            $("#regStatus").html(lang.connected_to_web_socket);

            $("#WebRtcFailed").hide();

            // Auto start register
            Register();
        });
        transport.on('disconnected', function (d) {
            console.log("Disconnected from Web Socket!"+ d.code);
            $("#regStatus").html(lang.disconnected_from_web_socket);
        });
        transport.on('transportError', function (e) {
            console.log("Web Socket error: "+ e);
            $("#regStatus").html(lang.web_socket_error);

            $("#WebRtcFailed").show();
        });
    });

    // Inbound Calls
    userAgent.on("invite", function (session) {
        ReceiveCall(session);
    });

    // Inbound Text Message
    userAgent.on('message', function (message) {
        ReceiveMessage(message);
    });

    // Start the WebService Connection loop
    console.log("Connecting to Web Socket...");
    $("#regStatus").html(lang.connecting_to_web_socket);
    userAgent.start();
    
    // Register Buttons
    $("#reglink").on('click', Register);
    $("#dereglink").on('click', Unregister);

    // WebRTC Error Page
    $("#WebRtcFailed").on('click', function(){
        Confirm(lang.error_connecting_web_socket, lang.web_socket_error, function(){
            window.open("https://"+ wssServer +":"+ WebSocketPort +"/httpstatus");
        }, null);
    });
}

// Registration
// ============
function Register() {
    if (userAgent == null || userAgent.isRegistered()) return;

    console.log("Sending Registration...");
    $("#regStatus").html(lang.sending_registration);
    userAgent.register()
}
function Unregister() {
    if (userAgent == null || !userAgent.isRegistered()) return;

    console.log("Unsubscribing...");
    $("#regStatus").html(lang.unsubscribing);
    try {
        UnsubscribeAll();
    } catch (e) { }

    console.log("Disconnecting...");
    $("#regStatus").html(lang.disconnecting);
    userAgent.unregister();

    isReRegister = false;
}

// Inbound Calls
// =============
function ReceiveCall(session) {
    var callerID = session.remoteIdentity.displayName;
    var did = session.remoteIdentity.uri.user;

    console.log("New Incoming Call!", "\""+ callerID +"\" <"+ did +">");

    var CurrentCalls = userAgent.sessions.length;

    var buddyObj = FindBuddyByDid(did);
    // Make new contact of its not there
    if(buddyObj == null) {
        var buddyType = (did.length > DidLength)? "contact" : "extension";
        var focusOnBuddy = (CurrentCalls==0);
        buddyObj = MakeBuddy(buddyType, true, focusOnBuddy, true, callerID, did);
    }
    var buddy = buddyObj.identity;

    // Time Stamp
    window.clearInterval(session.data.callTimer);
    var startTime = moment.utc();
    session.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    $("#contact-" + buddy + "-timer").show();
    session.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime)); 
        $("#contact-" + buddy + "-timer").html(formatShortDuration(duration.asSeconds()));
    }, 1000);
    session.data.buddyId = buddy;
    session.data.calldirection = "inbound";
    session.data.terminateby = "them";
    session.data.withvideo = false;
    var videoInvite = false;
    if(session.request.body){
        // Asterisk 13 PJ_SIP always sends m=video if endpoint has video codec,
        // even if origional invite does not specify video.
        if(session.request.body.indexOf("m=video") > -1) videoInvite = true;
    }

    // Inbound You or They Rejected
    session.on('rejected', function (response, cause) {
        console.log("Call rejected: " + cause);

        AddCallMessage(buddy, session, response.status_code, cause);
    });
    // They cancelled (Gets called regardless)
    session.on('terminated', function(response, cause) {

        // Stop the ringtone
        if(session.data.rinngerObj){
            session.data.rinngerObj.pause();
            session.data.rinngerObj = null;
        }

        CloseWindow();

        console.log("Call terminated");

        window.clearInterval(session.data.callTimer);

        $("#contact-" + buddy + "-timer").html("");
        $("#contact-" + buddy + "-timer").hide();
        $("#contact-" + buddy + "-msg").html("");
        $("#contact-" + buddy + "-msg").hide();
        $("#contact-" + buddy + "-AnswerCall").hide();

        RefreshStream(buddyObj);
        updateScroll(buddyObj.identity);
        UpdateBuddyList();

        // Once the call is answered into a line, you can then teardown 
        // teardownSession(buddyObj.identity, session, 0, "Call Cancelled");
    });

    // Start Handle Call
    if(DoNotDisturbEnabled || DoNotDisturbPolicy == "enabled") {
        console.log("Do Not Disturb Enabled, rejecting call.");
        RejectCall(buddyObj.identity);
        return;
    }
    if(CurrentCalls >= 1){
        if(CallWaitingEnabled == false || CallWaitingEnabled == "disabled"){
            console.log("Call Waiting Disabled, rejecting call.");
            RejectCall(buddyObj.identity);
            return;
        }
    }
    if(AutoAnswerEnabled || AutoAnswerPolicy == "enabled"){
        if(CurrentCalls == 0){ // There are no other calls, so you can answer
            console.log("Auto Answer Call...");
            var buddyId = buddyObj.identity;
            window.setTimeout(function(){
                // If the call is with video, assume the auto answer is also
                // In order for this to work nicely, the recipient maut be "ready" to accept video calls
                // In order to ensure video call compatibility (i.e. the recipient must have their web cam in, and working)
                // The NULL video sould be configured
                // https://github.com/InnovateAsterisk/Browser-Phone/issues/26
                if(videoInvite) {
                    AnswerVideoCall(buddyId)
                }
                else {
                    AnswerAudioCall(buddyId);
                }
            }, 1000);

            // Select Buddy
            SelectBuddy(buddyObj.identity);
            return;
        }
        else {
            console.warn("Could not auto answer call, already on a call.");
        }
    }
    
    // Show the Answer Thingy
    $("#contact-" + buddyObj.identity + "-msg").html(lang.incomming_call_from +" " + callerID);
    $("#contact-" + buddyObj.identity + "-msg").show();
    if(videoInvite){
        $("#contact-"+ buddyObj.identity +"-answer-video").show();
    }
    else {
        $("#contact-"+ buddyObj.identity +"-answer-video").hide();
    }
    $("#contact-" + buddyObj.identity + "-AnswerCall").show();
    updateScroll(buddyObj.identity);

    // Play Ring Tone if not on the phone
    if(CurrentCalls >= 1){
        // Play Alert
        var rinnger = new Audio();
        rinnger.loop = false;
        rinnger.oncanplaythrough = function(e) {
            if (typeof rinnger.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                rinnger.setSinkId(getRingerOutputID()).then(function() {
                    console.log("Set sinkId to:", getRingerOutputID());
                }).catch(function(e){
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
            // If there has been no interaction with the page at all... this page will not work
            rinnger.play().then(function(){
                // Audio Is Playing
            }).catch(function(e){
                console.warn("Unable to play audio file.", e);
            }); 
        }
        rinnger.src = hostingPrefex + "Tone_CallWaiting.mp3";
        session.data.rinngerObj = rinnger;
    } else {
        // Play Ring Tone
        var rinnger = new Audio();
        rinnger.loop = true;
        rinnger.oncanplaythrough = function(e) {
            if (typeof rinnger.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                rinnger.setSinkId(getRingerOutputID()).then(function() {
                    console.log("Set sinkId to:", getRingerOutputID());
                }).catch(function(e){
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
            // If there has been no interaction with the page at all... this page will not work
            rinnger.play().then(function(){
                // Audio Is Playing
            }).catch(function(e){
                console.warn("Unable to play audio file.", e);
            }); 
        }
        rinnger.src = hostingPrefex + "Ringtone_1.mp3";
        session.data.rinngerObj = rinnger;
    }

    // Check if that buddy is not already on a call??
    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
    if (streamVisible) {
        // Remove anything distracting
        HidePopup();
    } 
    else {
        CloseWindow(); // If something else was there, close it.
        // Show Call Answer Window
        var callAnswerHtml = "<div class=\"UiWindowField scroller\" style=\"text-align:center\">"
        callAnswerHtml += "<div style=\"font-size: 18px; margin-top:05px\">"+ callerID + "<div>";
        callAnswerHtml += "<div class=callAnswerBuddyIcon style=\"background-image: url("+ getPicture(buddyObj.identity) +"); margin-top:15px\"></div>";
        callAnswerHtml += "<div style=\"margin-top:5px\"><button onclick=\"AnswerAudioCall('"+ buddyObj.identity +"')\" class=answerButton><i class=\"fa fa-phone\"></i> "+ lang.answer_call +"</button></div>";
        if(videoInvite) {
            callAnswerHtml += "<div style=\"margin-top:15px\"><button onclick=\"AnswerVideoCall('"+ buddyObj.identity +"')\" class=answerButton><i class=\"fa fa-video-camera\"></i> "+ lang.answer_call_with_video +"</button></div>";
        }
        callAnswerHtml += "</div>";
        OpenWindow(callAnswerHtml, lang.incomming_call_from, 350, 300, true, false, lang.reject_call, function(){
            // Reject the call
            RejectCall(buddyObj.identity);
            CloseWindow();
        }, "Close", function(){
            // Let it ring
            CloseWindow();
        }, null, null);

        // Add a notification badge
        IncreaseMissedBadge(buddyObj.identity);

        // Show notification
        // =================
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                var noticeOptions = { body: lang.incomming_call_from +" " + callerID, icon: getPicture(buddyObj.identity) }
                var inComingCallNotification = new Notification(lang.incomming_call, noticeOptions);
                inComingCallNotification.onclick = function (event) {

                    var buddyId = buddyObj.identity;
                    window.setTimeout(function(){
                        // https://github.com/InnovateAsterisk/Browser-Phone/issues/26
                        if(videoInvite) {
                            AnswerVideoCall(buddyId)
                        }
                        else {
                            AnswerAudioCall(buddyId);
                        }
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
    CloseWindow();

    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) {
        console.warn("Audio Answer failed, null buddy");
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }

    var session = getSession(buddy);
    if (session == null) {
        console.warn("Audio Answer failed, null session");
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }
    
    // Stop the ringtone
    if(session.data.rinngerObj){
        session.data.rinngerObj.pause();
        session.data.rinngerObj = null;
    }

    // Check vitals
    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }
    $("#contact-" + buddy + "-timer").html("");
    $("#contact-" + buddy + "-timer").hide();
    $("#contact-" + buddy + "-msg").html("");
    $("#contact-" + buddy + "-msg").hide();
    $("#contact-" + buddy + "-AnswerCall").hide();

    // Create a new Line and move the session over to the line
    var callerID = session.remoteIdentity.displayName;
    var did = session.remoteIdentity.uri.user;
    var newLineNumber = Lines.length + 1;
    lineObj = new Line(newLineNumber, callerID, did, buddyObj);
    lineObj.SipSession = session;
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    Lines.push(lineObj);
    AddLineHtml(lineObj);
    SelectLine(newLineNumber);
    UpdateBuddyList();
    // Assign the Session

    var currentAudioDevice = getAudioSrcID();
    var confirmedAudioDevice = false;
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (currentAudioDevice != "default")? { exact: currentAudioDevice } : "default"
                },
                video: false
            }
        }
    }
    for (var i = 0; i < AudioinputDevices.length; ++i) {
        if(currentAudioDevice != "default" && currentAudioDevice == AudioinputDevices[i].deviceId) {
            confirmedAudioDevice = true;
        }
    }
    // Check devices
    if(currentAudioDevice != "default" && !confirmedAudioDevice) {
        console.warn("The audio device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        localDB.setItem("AudioSrcId", "default"); // resets for later and subsequent calls
    }
    // Add additional Constraints
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Send Answer
    lineObj.SipSession.accept(spdOptions);
    lineObj.SipSession.data.withvideo = false;
    lineObj.SipSession.data.VideoSourceDevice = null;
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();

    // Wire up UI
    wireupAudioSession(lineObj);
    $("#contact-" + buddy + "-msg").html(lang.call_in_progress);

    // Clear Answer Buttons
    $("#contact-" + buddy + "-AnswerCall").hide();
}
function AnswerVideoCall(buddy) {
    CloseWindow();

    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) {
        console.warn("Audio Answer failed, null buddy");
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }

    var session = getSession(buddy);
    if (session == null) {
        console.warn("Video Answer failed, null session");
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }

    // Stop the ringtone
    if(session.data.rinngerObj){
        session.data.rinngerObj.pause();
        session.data.rinngerObj = null;
    }

    // Check vitals
    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
        return;
    }
    if(HasVideoDevice == false){
        console.warn("No video devices (webcam) found, switching to audio call.");
        AnswerAudioCall(buddy);
        return;
    }
    $("#contact-" + buddy + "-timer").html("");
    $("#contact-" + buddy + "-timer").hide();
    $("#contact-" + buddy + "-msg").html("");
    $("#contact-" + buddy + "-msg").hide();
    $("#contact-" + buddy + "-AnswerCall").hide();

    // Create a new Line and move the session over to the line
    var callerID = session.remoteIdentity.displayName;
    var did = session.remoteIdentity.uri.user;
    var newLineNumber = Lines.length + 1;
    lineObj = new Line(newLineNumber, callerID, did, buddyObj);
    lineObj.SipSession = session;
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    Lines.push(lineObj);
    AddLineHtml(lineObj);
    SelectLine(newLineNumber);
    UpdateBuddyList();

    var currentAudioDevice = getAudioSrcID();
    var confirmedAudioDevice = false;
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (currentAudioDevice != "default")? { exact: currentAudioDevice } : "default"
                },
                video: false
            }
        }
    }
    for (var i = 0; i < AudioinputDevices.length; ++i) {
        if(currentAudioDevice != "default" && currentAudioDevice == AudioinputDevices[i].deviceId) {
            confirmedAudioDevice = true;
        }
    }
    // Check devices
    if(currentAudioDevice != "default" && !confirmedAudioDevice) {
        console.warn("The audio device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        localDB.setItem("AudioSrcId", "default"); // resets for later and subsequent calls
    }
    // Add additional Constraints
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Configure Video
    var currentVideoDevice = getVideoSrcID();
    var confirmedVideoDevice = false;
    for (var i = 0; i < VideoinputDevices.length; ++i) {
        if(currentVideoDevice != "default" && currentVideoDevice == VideoinputDevices[i].deviceId) {
            confirmedVideoDevice = true;
        }
    }
    // The user has a camera
    spdOptions.sessionDescriptionHandlerOptions.constraints.video =  {deviceId: (currentVideoDevice != "default")?  { exact: currentVideoDevice } : "default" }
    // Check Video devices
    if(currentVideoDevice != "default" && !confirmedVideoDevice) {
        console.warn("The video device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = "default";
        ocalDB.setItem("VideoSrcId", "default"); // resets for later and subsequent calls
    }
    // Add additional Constraints
    if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
    if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
    if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;

    // Send Answer
    lineObj.SipSession.accept(spdOptions);
    lineObj.SipSession.data.withvideo = true;
    lineObj.SipSession.data.VideoSourceDevice = getVideoSrcID();
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();

    // Wire up UI
    wireupVideoSession(lineObj);
    $("#contact-" + buddy + "-msg").html(lang.call_in_progress);

    // Clear Answer Buttons
    $("#contact-" + buddy + "-AnswerCall").hide();
}

function RejectCall(buddy) {
    var session = getSession(buddy);
    if (session = null) {
        console.warn("Reject failed, null session");
        $("#contact-" + buddy + "-msg").html(lang.call_failed);
        $("#contact-" + buddy + "-AnswerCall").hide();
    }
    session.data.terminateby = "us";
    session.reject({ 
        statusCode: 486, 
        reasonPhrase: "Busy Here" 
    });
    $("#contact-" + buddy + "-msg").html(lang.call_rejected);
}

// Session Wireup
// ==============
function wireupAudioSession(lineObj) {
    if (lineObj == null) return;

    var MessageObjId = "#line-" + lineObj.LineNumber + "-msg";
    var session = lineObj.SipSession;

    session.on('progress', function (response) {
        // Provisional 1xx
        if(response.status_code == 100){
            $(MessageObjId).html(lang.trying);
        } else if(response.status_code == 180){
            $(MessageObjId).html(lang.ringing);
            // Play Early Media
            var earlyMedia = new Audio();
            earlyMedia.loop = true;
            earlyMedia.oncanplaythrough = function(e) {
                if (typeof earlyMedia.sinkId !== 'undefined' && getAudioOutputID() != "default") {
                    earlyMedia.setSinkId(getAudioOutputID()).then(function() {
                        console.log("Set sinkId to:", getAudioOutputID());
                    }).catch(function(e){
                        console.warn("Failed not apply setSinkId.", e);
                    });
                }
                earlyMedia.play().then(function(){
                    // Audio Is Playing
                }).catch(function(e){
                    console.warn("Unable to play audio file.", e);
                }); 
            }
            var soundFile = hostingPrefex + "Tone_EarlyMedia-European.mp3";
            if(UserLocale().indexOf("us") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-US.mp3";
            }
            if(UserLocale().indexOf("gb") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-UK.mp3";
            }
            if(UserLocale().indexOf("au") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-Australia.mp3";
            }
            if(UserLocale().indexOf("jp") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-Japan.mp3";
            }
            earlyMedia.src = soundFile;
            session.data.earlyMedia = earlyMedia;
        } else {
            $(MessageObjId).html(response.reason_phrase + "...");
        }
    });
    session.on('trackAdded', function () {
        var pc = session.sessionDescriptionHandler.peerConnection;

        // Gets Remote Audio Track (Local audio is setup via initial GUM)
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track && receiver.track.kind == "audio"){
                remoteStream.addTrack(receiver.track);
            } 
        });
        var remoteAudio = $("#line-" + lineObj.LineNumber + "-remoteAudio").get(0);
        remoteAudio.srcObject = remoteStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(getAudioOutputID()).then(function(){
                    console.log("sinkId applied: "+ getAudioOutputID());
                }).catch(function(e){
                    console.warn("Error using setSinkId: ", e);
                });
            }
            remoteAudio.play();
        }
    });
    session.on('accepted', function (data) {

        if(session.data.earlyMedia){
            session.data.earlyMedia.pause();
            session.data.earlyMedia = null;
        }

        window.clearInterval(session.data.callTimer);
        var startTime = moment.utc();
        session.data.callTimer = window.setInterval(function(){
            var now = moment.utc();
            var duration = moment.duration(now.diff(startTime)); 
            $("#line-" + lineObj.LineNumber + "-timer").html(formatShortDuration(duration.asSeconds()));
        }, 1000);

        if(RecordAllCalls || CallRecordingPolicy == "enabled") {
            StartRecording(lineObj.LineNumber);
        }

        $("#line-" + lineObj.LineNumber + "-progress").hide();
        $("#line-" + lineObj.LineNumber + "-VideoCall").hide();
        $("#line-" + lineObj.LineNumber + "-ActiveCall").show();

        // Audo Monitoring
        lineObj.LocalSoundMeter = StartLocalAudioMediaMonitoring(lineObj.LineNumber, session);
        lineObj.RemoteSoundMeter = StartRemoteAudioMediaMonitoring(lineObj.LineNumber, session);
        
        $(MessageObjId).html(lang.call_in_progress);
    });
    session.on('rejected', function (response, cause) {
        // Should only apply befor answer
        $(MessageObjId).html(lang.call_rejected +": " + cause);
        console.log("Call rejected: " + cause);
        teardownSession(lineObj, response.status_code, response.reason_phrase);
    });
    session.on('failed', function (response, cause) {
        $(MessageObjId).html(lang.call_failed + ": " + cause);
        console.log("Call failed: " + cause);
        teardownSession(lineObj, 0, "Call failed");
    });
    session.on('cancel', function () {
        $(MessageObjId).html(lang.call_cancelled);
        console.log("Call Cancelled");
        teardownSession(lineObj, 0, "Cancelled by caller");
    });
    // referRequested
    // replaced
    session.on('bye', function () {
        $(MessageObjId).html(lang.call_ended);
        console.log("Call ended, bye!");
        teardownSession(lineObj, 16, "Normal Call clearing");
    });
    session.on('terminated', function (message, cause) {
        console.log("Session terminated");
    });
    session.on('reinvite', function (session) {
        console.log("Session reinvited!");
    });
    //dtmf
    session.on('directionChanged', function() {
        var direction = session.sessionDescriptionHandler.getDirection();
        console.log("Direction Change: ", direction);
    });

    $("#line-" + lineObj.LineNumber + "-btn-settings").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-audioCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-videoCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-search").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-remove").prop('disabled','disabled');

    $("#line-" + lineObj.LineNumber + "-progress").show();
    $("#line-" + lineObj.LineNumber + "-msg").show();

    if(lineObj.BuddyObj.type == "group") {
        $("#line-" + lineObj.LineNumber + "-conference").show();
        MonitorBuddyConference(lineObj);
    } 
    else {
        $("#line-" + lineObj.LineNumber + "-conference").hide();
    }
}
function wireupVideoSession(lineObj) {
    if (lineObj == null) return;

    var MessageObjId = "#line-" + lineObj.LineNumber + "-msg";
    var session = lineObj.SipSession;

    session.on('trackAdded', function () {
        // Gets remote tracks
        var pc = session.sessionDescriptionHandler.peerConnection;
        var remoteAudioStream = new MediaStream();
        var remoteVideoStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track){
                if(receiver.track.kind == "audio"){
                    remoteAudioStream.addTrack(receiver.track);
                }
                if(receiver.track.kind == "video"){
                    remoteVideoStream.addTrack(receiver.track);
                }
            }
        });
        var remoteAudio = $("#line-" + lineObj.LineNumber + "-remoteAudio").get(0);
        remoteAudio.srcObject = remoteAudioStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(getAudioOutputID()).then(function(){
                    console.log("sinkId applied: "+ getAudioOutputID());
                }).catch(function(e){
                    console.warn("Error using setSinkId: ", e);
                });
            }
            remoteAudio.play();
        }

        var remoteVideo = $("#line-" + lineObj.LineNumber + "-remoteVideo").get(0);
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
                    localVideoStream.addTrack(sender.track);
                }
            });
            var localVideo = $("#line-" + lineObj.LineNumber + "-localVideo").get(0);
            localVideo.srcObject = localVideoStream;
            localVideo.onloadedmetadata = function(e) {
                localVideo.play();
            }
        }, 1000);
    });
    session.on('progress', function (response) {
        // Provisional 1xx
        if(response.status_code == 100){
            $(MessageObjId).html(lang.trying);
        } else if(response.status_code == 180){
            $(MessageObjId).html(lang.ringing);
            // Play Early Media
            var earlyMedia = new Audio();
            earlyMedia.loop = true;
            earlyMedia.oncanplaythrough = function(e) {
                if (typeof earlyMedia.sinkId !== 'undefined' && getAudioOutputID() != "default") {
                    earlyMedia.setSinkId(getAudioOutputID()).then(function() {
                        console.log("Set sinkId to:", getAudioOutputID());
                    }).catch(function(e){
                        console.warn("Failed not apply setSinkId.", e);
                    });
                }
                earlyMedia.play().then(function(){
                    // Audio Is Playing
                }).catch(function(e){
                    console.warn("Unable to play audio file.", e);
                }); 
            }
            var soundFile = hostingPrefex + "Tone_EarlyMedia-European.mp3";
            if(UserLocale().indexOf("us") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-US.mp3";
            }
            if(UserLocale().indexOf("gb") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-UK.mp3";
            }
            if(UserLocale().indexOf("au") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-Australia.mp3";
            }
            if(UserLocale().indexOf("jp") > -1){
                soundFile = hostingPrefex + "Tone_EarlyMedia-Japan.mp3";
            }
            earlyMedia.src = soundFile;
            session.data.earlyMedia = earlyMedia;
        } else {
            $(MessageObjId).html(response.reason_phrase + "...");
        }
    });
    session.on('accepted', function (data) {
        
        if(session.data.earlyMedia){
            session.data.earlyMedia.pause();
            session.data.earlyMedia = null;
        }

        window.clearInterval(session.data.callTimer);
        $("#line-" + lineObj.LineNumber + "-timer").show();
        var startTime = moment.utc();
        session.data.callTimer = window.setInterval(function(){
            var now = moment.utc();
            var duration = moment.duration(now.diff(startTime)); 
            $("#line-" + lineObj.LineNumber + "-timer").html(formatShortDuration(duration.asSeconds()));
        }, 1000);

        if(RecordAllCalls || CallRecordingPolicy == "enabled") {
            StartRecording(lineObj.LineNumber);
        }

        $("#line-"+ lineObj.LineNumber +"-progress").hide();
        $("#line-"+ lineObj.LineNumber +"-VideoCall").show();
        $("#line-"+ lineObj.LineNumber +"-ActiveCall").show();

        $("#line-"+ lineObj.LineNumber +"-btn-Conference").hide(); // Cannot conference a Video Call (Yet...)
        $("#line-"+ lineObj.LineNumber +"-btn-CancelConference").hide();
        $("#line-"+ lineObj.LineNumber +"-Conference").hide();

        $("#line-"+ lineObj.LineNumber +"-btn-Transfer").hide(); // Cannot transfer a Video Call (Yet...)
        $("#line-"+ lineObj.LineNumber +"-btn-CancelTransfer").hide();
        $("#line-"+ lineObj.LineNumber +"-Transfer").hide();

        // Default to use Camera
        $("#line-"+ lineObj.LineNumber +"-src-camera").prop("disabled", true);
        $("#line-"+ lineObj.LineNumber +"-src-canvas").prop("disabled", false);
        $("#line-"+ lineObj.LineNumber +"-src-desktop").prop("disabled", false);
        $("#line-"+ lineObj.LineNumber +"-src-video").prop("disabled", false);

        // Start Audio Monitoring
        lineObj.LocalSoundMeter = StartLocalAudioMediaMonitoring(lineObj.LineNumber, session);
        lineObj.RemoteSoundMeter = StartRemoteAudioMediaMonitoring(lineObj.LineNumber, session);

        $(MessageObjId).html(lang.call_in_progress);
    });
    session.on('rejected', function (response, cause) {
        // Should only apply befor answer
        $(MessageObjId).html(lang.call_rejected +": "+ cause);
        console.log("Call rejected: "+ cause);
        teardownSession(lineObj, response.status_code, response.reason_phrase);
    });
    session.on('failed', function (response, cause) {
        $(MessageObjId).html(lang.call_failed +": "+ cause);
        console.log("Call failed: "+ cause);
        teardownSession(lineObj, 0, "call failed");
    });
    session.on('cancel', function () {
        $(MessageObjId).html(lang.call_cancelled);
        console.log("Call Cancelled");
        teardownSession(lineObj, 0, "Cancelled by caller");
    });
    // referRequested
    // replaced
    session.on('bye', function () {
        $(MessageObjId).html(lang.call_ended);
        console.log("Call ended, bye!");
        teardownSession(lineObj, 16, "Normal Call clearing");
    });
    session.on('terminated', function (message, cause) {
        console.log("Session terminated");
    });
    session.on('reinvite', function (session) {
        console.log("Session reinvited!");
    });
    // dtmf
    session.on('directionChanged', function() {
        var direction = session.sessionDescriptionHandler.getDirection();
        console.log("Direction Change: ", direction);
    });

    $("#line-" + lineObj.LineNumber + "-btn-settings").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-audioCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-videoCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-search").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-remove").prop('disabled','disabled');

    $("#line-" + lineObj.LineNumber + "-progress").show();
    $("#line-" + lineObj.LineNumber + "-msg").show();
}
function teardownSession(lineObj, reasonCode, reasonText) {
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    if(session.data.teardownComplete == true) return;
    session.data.teardownComplete = true; // Run this code only once

    // Call UI
    HidePopup();

    // End any child calls
    if(session.data.childsession){
        try{
            if(session.data.childsession.status == SIP.Session.C.STATUS_CONFIRMED){
                session.data.childsession.bye();
            } 
            else{
                session.data.childsession.cancel();
            }
        } catch(e){}
    }
    session.data.childsession = null;

    // Mixed Tracks
    if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
        session.data.AudioSourceTrack.stop();
        session.data.AudioSourceTrack = null;
    }
    // Stop any Early Media
    if(session.data.earlyMedia){
        session.data.earlyMedia.pause();
        session.data.earlyMedia = null;
    }

    // Stop Recording if we are
    StopRecording(lineObj.LineNumber,true);

    // Audio Meters
    if(lineObj.LocalSoundMeter != null){
        lineObj.LocalSoundMeter.stop();
        lineObj.LocalSoundMeter = null;
    }
    if(lineObj.RemoteSoundMeter != null){
        lineObj.RemoteSoundMeter.stop();
        lineObj.RemoteSoundMeter = null;
    }

    // End timers
    window.clearInterval(session.data.videoResampleInterval);
    window.clearInterval(session.data.callTimer);

    // Add to stream
    AddCallMessage(lineObj.BuddyObj.identity, session, reasonCode, reasonText);

    // Close up the UI
    window.setTimeout(function () {
        RemoveLine(lineObj);
    }, 1000);

    UpdateBuddyList();
}

// Conference Monitor
// ==================
// TODO
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
            }
            catch(e){}

            // JsonEvent.Conference
            // JsonEvent.Channel
            // JsonEvent.TalkingStatus: "on" | "off"
            // JsonEvent.Event: "ConfbridgeStart" | "ConfbridgeJoin" | "ConfbridgeTalking" | "ConfbridgeLeave" | "ConfbridgeEnd"
            // CallerIDName: "Alfredo Dixon"
            // CallerIDNum: "800"

            if(JsonEvent.Conference == buddyObj.identity) {

                console.log(JsonEvent);

                var mutedHTML = "Muted: <span style=\"color:red\"><i class=\"fa fa-microphone-slash\"></i> "+ lang.yes +"</span>"
                var unMutedHTML = "Muted: <span style=\"color:green\"><i class=\"fa fa-microphone-slash\"></i>  "+ lang.no +"</span>"

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
function StartRemoteAudioMediaMonitoring(lineNum, session) {
    console.log("Creating RemoteAudio AudioContext on Line:" + lineNum);

    // Create local SoundMeter
    var soundMeter = new SoundMeter(session.id, lineNum);
    if(soundMeter == null){
        console.warn("AudioContext() RemoteAudio not available... it fine.");
        return null;
    }

    // Ready the getStats request
    var remoteAudioStream = new MediaStream();
    var audioReceiver = null;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getReceivers().forEach(function (RTCRtpReceiver) {
        if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio"){
            if(audioReceiver == null) {
                remoteAudioStream.addTrack(RTCRtpReceiver.track);
                audioReceiver = RTCRtpReceiver;
            }
            else {
                console.log("Found another Track, but audioReceiver not null");
                console.log(RTCRtpReceiver);
                console.log(RTCRtpReceiver.track);
            }
        }
    });


    // Setup Charts
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

    // Receive Kilobits per second
    soundMeter.ReceiveBitRateChart = new Chart($("#line-"+ lineNum +"-AudioReceiveBitRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.receive_kilobits_per_second,
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

    // Receive Packets per second
    soundMeter.ReceivePacketRateChart = new Chart($("#line-"+ lineNum +"-AudioReceivePacketRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.receive_packets_per_second,
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

    // Receive Packet Loss
    soundMeter.ReceivePacketLossChart = new Chart($("#line-"+ lineNum +"-AudioReceivePacketLoss"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.receive_packet_loss,
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

    // Receive Jitter
    soundMeter.ReceiveJitterChart = new Chart($("#line-"+ lineNum +"-AudioReceiveJitter"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.receive_jitter,
                data: MakeDataArray(0, maxDataLength),
                backgroundColor: 'rgba(0, 38, 168, 0.5)',
                borderColor: 'rgba(0, 38, 168, 1)',
                borderWidth: 1,
                pointRadius: 1
            }]
        },
        options: ChatHistoryOptions
    });

    // Receive Audio Levels
    soundMeter.ReceiveLevelsChart = new Chart($("#line-"+ lineNum +"-AudioReceiveLevels"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.receive_audio_levels,
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
    soundMeter.connectToSource(remoteAudioStream, function (e) {
        if (e != null) return;

        // Create remote SoundMeter
        console.log("SoundMeter for RemoteAudio Connected, displaying levels for Line: " + lineNum);
        soundMeter.levelsInterval = window.setInterval(function () {
            // Calculate Levels
            //value="0" max="1" high="0.25" (this seems low... )
            var level = soundMeter.instant * 4.0;
            if (level > 1) level = 1;
            var instPercent = level * 100;

            $("#line-" + lineNum + "-Speaker").css("height", instPercent.toFixed(2) +"%");
        }, 200);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            if(audioReceiver != null) {
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
                            var kbitsPerSec = (8 * (report.bytesReceived - ReceiveBitRateChart.lastValueBytesReceived))/1000;

                            ReceiveBitRateChart.lastValueTimestamp = report.timestamp;
                            ReceiveBitRateChart.lastValueBytesReceived = report.bytesReceived;

                            ReceiveBitRateChart.data.datasets[0].data.push(kbitsPerSec);
                            ReceiveBitRateChart.data.labels.push("");
                            if(ReceiveBitRateChart.data.datasets[0].data.length > maxDataLength) {
                                ReceiveBitRateChart.data.datasets[0].data.splice(0,1);
                                ReceiveBitRateChart.data.labels.splice(0,1);
                            }
                            ReceiveBitRateChart.update();

                            // Receive Packets Per Second
                            var PacketsPerSec = (report.packetsReceived - ReceivePacketRateChart.lastValuePacketReceived);

                            ReceivePacketRateChart.lastValueTimestamp = report.timestamp;
                            ReceivePacketRateChart.lastValuePacketReceived = report.packetsReceived;

                            ReceivePacketRateChart.data.datasets[0].data.push(PacketsPerSec);
                            ReceivePacketRateChart.data.labels.push("");
                            if(ReceivePacketRateChart.data.datasets[0].data.length > maxDataLength) {
                                ReceivePacketRateChart.data.datasets[0].data.splice(0,1);
                                ReceivePacketRateChart.data.labels.splice(0,1);
                            }
                            ReceivePacketRateChart.update();

                            // Receive Packet Loss
                            var PacketsLost = (report.packetsLost - ReceivePacketLossChart.lastValuePacketLoss);

                            ReceivePacketLossChart.lastValueTimestamp = report.timestamp;
                            ReceivePacketLossChart.lastValuePacketLoss = report.packetsLost;

                            ReceivePacketLossChart.data.datasets[0].data.push(PacketsLost);
                            ReceivePacketLossChart.data.labels.push("");
                            if(ReceivePacketLossChart.data.datasets[0].data.length > maxDataLength) {
                                ReceivePacketLossChart.data.datasets[0].data.splice(0,1);
                                ReceivePacketLossChart.data.labels.splice(0,1);
                            }
                            ReceivePacketLossChart.update();

                            // Receive Jitter
                            ReceiveJitterChart.data.datasets[0].data.push(report.jitter);
                            ReceiveJitterChart.data.labels.push("");
                            if(ReceiveJitterChart.data.datasets[0].data.length > maxDataLength) {
                                ReceiveJitterChart.data.datasets[0].data.splice(0,1);
                                ReceiveJitterChart.data.labels.splice(0,1);
                            }
                            ReceiveJitterChart.update();
                        }
                        if(report.type == "track") {

                            // Receive Audio Levels
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
    });

    return soundMeter;
}
function StartLocalAudioMediaMonitoring(lineNum, session) {
    console.log("Creating LocalAudio AudioContext on line " + lineNum);

    // Create local SoundMeter
    var soundMeter = new SoundMeter(session.id, lineNum);
    if(soundMeter == null){
        console.warn("AudioContext() LocalAudio not available... its fine.")
        return null;
    }

    // Ready the getStats request
    var localAudioStream = new MediaStream();
    var audioSender = null;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio"){
            if(audioSender == null){
                console.log("Adding Track to Monitor: ", RTCRtpSender.track.label);
                localAudioStream.addTrack(RTCRtpSender.track);
                audioSender = RTCRtpSender;
            }
            else {
                console.log("Found another Track, but audioSender not null");
                console.log(RTCRtpSender);
                console.log(RTCRtpSender.track);
            }
        }
    });

    // Setup Charts
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

    // Send Kilobits Per Second
    soundMeter.SendBitRateChart = new Chart($("#line-"+ lineNum +"-AudioSendBitRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.send_kilobits_per_second,
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

    // Send Packets Per Second
    soundMeter.SendPacketRateChart = new Chart($("#line-"+ lineNum +"-AudioSendPacketRate"), {
        type: 'line',
        data: {
            labels: MakeDataArray("", maxDataLength),
            datasets: [{
                label: lang.send_packets_per_second,
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
    soundMeter.connectToSource(localAudioStream, function (e) {
        if (e != null) return;

        console.log("SoundMeter for LocalAudio Connected, displaying levels for Line: " + lineNum);
        soundMeter.levelsInterval = window.setInterval(function () {
            // Calculate Levels
            //value="0" max="1" high="0.25" (this seems low... )
            var level = soundMeter.instant * 4.0;
            if (level > 1) level = 1;
            var instPercent = level * 100;
            $("#line-" + lineNum + "-Mic").css("height", instPercent.toFixed(2) +"%");
        }, 200);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            // Sending Audio Track
            if(audioSender != null) {
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
                            var kbitsPerSec = (8 * (report.bytesSent - SendBitRateChart.lastValueBytesSent))/1000;

                            SendBitRateChart.lastValueTimestamp = report.timestamp;
                            SendBitRateChart.lastValueBytesSent = report.bytesSent;

                            SendBitRateChart.data.datasets[0].data.push(kbitsPerSec);
                            SendBitRateChart.data.labels.push("");
                            if(SendBitRateChart.data.datasets[0].data.length > maxDataLength) {
                                SendBitRateChart.data.datasets[0].data.splice(0,1);
                                SendBitRateChart.data.labels.splice(0,1);
                            }
                            SendBitRateChart.update();

                            // Send Packets Per Second
                            var PacketsPerSec = report.packetsSent - SendPacketRateChart.lastValuePacketSent;

                            SendPacketRateChart.lastValueTimestamp = report.timestamp;
                            SendPacketRateChart.lastValuePacketSent = report.packetsSent;

                            SendPacketRateChart.data.datasets[0].data.push(PacketsPerSec);
                            SendPacketRateChart.data.labels.push("");
                            if(SendPacketRateChart.data.datasets[0].data.length > maxDataLength) {
                                SendPacketRateChart.data.datasets[0].data.splice(0,1);
                                SendPacketRateChart.data.labels.splice(0,1);
                            }
                            SendPacketRateChart.update();
                        }
                        if(report.type == "track") {
                            // Bug/security consern... this seems always to report "0"
                            // Possible reason: When applied to isolated streams, media metrics may allow an application to infer some characteristics of the isolated stream, such as if anyone is speaking (by watching the audioLevel statistic).
                            // console.log("Audio Sender: " + report.audioLevel);
                        }
                    });
                });
            }
        } ,1000);
    });

    return soundMeter;
}

// Sounds Meter Class
// ==================
class SoundMeter {
    constructor(sessionId, lineNum) {
        var audioContext = null;
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
        }
        catch (e) {
            console.warn("AudioContext() LocalAudio not available... its fine.");
        }
        if (audioContext == null) return null;

        this.lineNum = lineNum;
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
        this.script = audioContext.createScriptProcessor(2048, 1, 1);
        const that = this;
        this.script.onaudioprocess = function (event) {
            const input = event.inputBuffer.getChannelData(0);
            let i;
            let sum = 0.0;
            for (i = 0; i < input.length; ++i) {
                sum += input[i] * input[i];
            }
            that.instant = Math.sqrt(sum / input.length);
        }
    }
    connectToSource(stream, callback) {
        console.log("SoundMeter connecting...");
        try {
            this.mic = this.context.createMediaStreamSource(stream);
            this.mic.connect(this.script);
            // necessary to make sample run, but should not be.
            this.script.connect(this.context.destination);
            callback(null);
        }
        catch (e) {
            console.error(e); // Probably not audio track
            callback(e);
        }
    }
    stop() {
        console.log("Disconnecting SoundMeter...");
        try {
            window.clearInterval(this.levelsInterval);
            this.levelsInterval = null;
        }
        catch (e) { }
        try {
            window.clearInterval(this.networkInterval);
            this.networkInterval = null;
        }
        catch (e) { }
        this.mic.disconnect();
        this.script.disconnect();
        this.mic = null;
        this.script = null;
        try {
            this.context.close();
        }
        catch (e) { }
        this.context = null;
    }
}
function MeterSettingsOutput(audioStream, objectId, direction, interval){
    var soundMeter = new SoundMeter(null, null);
    soundMeter.startTime = Date.now();
    soundMeter.connectToSource(audioStream, function (e) {
        if (e != null) return;

        console.log("SoundMeter Connected, displaying levels to:"+ objectId);
        soundMeter.levelsInterval = window.setInterval(function () {
            // Calculate Levels
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
function SubscribeAll() {
    console.log("Subscribe to voicemail Messages...");

    // conference, message-summary, dialog, presence, presence.winfo, xcap-diff, dialog.winfo, refer

    // Voicemail notice TODO: Make this optional
    var vmOptions = { expires: 300 };
    voicemailSubs = userAgent.subscribe(SipUsername + "@" + wssServer, 'message-summary', vmOptions); // message-summary = voicemail messages
    voicemailSubs.on('notify', function (notification) {

        // You have voicemail: 
        // Message-Account: sip:alice@example.com
        // Messages-Waiting: no
        // Fax-Message: 2/4
        // Voice-Message: 0/0 (0/0)   <-- new/old (new & urgent/ old & urgent)

        var messagesWaitng = false;
        $.each(notification.request.body.split("\n"), function (i, line) {
            if(line.indexOf("Messages-Waiting:") != -1){
                messagesWaitng = ($.trim(line.replace("Messages-Waiting:", "")) == "yes");
            }
        });

        if(messagesWaitng){
            // Notify user of voicemail
            console.log("You have voicemail!");

            // TODO: 
            // Check if already notified
            // Use Alert
            // Use Notification if allowed
            // Add Icon to User section
        }

    });

    // Dialog Subscription (This version isnt as nice as PIDF)
    // var dialogOptions = { expires: 300, extraHeaders: ['Accept: application/dialog-info+xml'] };

    // PIDF Subscription TODO: make this an option.
    var dialogOptions = { expires: 300, extraHeaders: ['Accept: application/pidf+xml'] };

    // Start subscribe all
    console.log("Starting Subscribe of all ("+ Buddies.length +") Extension Buddies...");
    for(var b=0; b<Buddies.length; b++) {
        var buddyObj = Buddies[b];
        if(buddyObj.type == "extension") {
            console.log("SUBSCRIBE: "+ buddyObj.ExtNo +"@" + wssServer);
            var blfObj = userAgent.subscribe(buddyObj.ExtNo +"@" + wssServer, 'presence', dialogOptions); 
            blfObj.data.buddyId = buddyObj.identity;
            blfObj.on('notify', function (notification) {
                RecieveBlf(notification);
            });
            BlfSubs.push(blfObj);
        }
    }
}
function SubscribeBuddy(buddyObj) {
    var dialogOptions = { expires: 300, extraHeaders: ['Accept: application/pidf+xml'] };
    if(buddyObj.type == "extension") {
        console.log("SUBSCRIBE: "+ buddyObj.ExtNo +"@" + wssServer);
        var blfObj = userAgent.subscribe(buddyObj.ExtNo +"@" + wssServer, 'presence', dialogOptions);
        blfObj.data.buddyId = buddyObj.identity;
        blfObj.on('notify', function (notification) {
            RecieveBlf(notification);
        });
        BlfSubs.push(blfObj);
    }
}
function RecieveBlf(notification) {
    if (userAgent == null || !userAgent.isRegistered()) return;

    var ContentType = notification.request.headers["Content-Type"][0].parsed;
    if (ContentType == "application/pidf+xml") {
        // Handle Presence
        /*
        // Asteriks chan_sip
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

        // Asterisk chan_pjsip
        <?xml version="1.0" encoding="UTF-8"?>
        <presence 
            entity="sip:300@192.168.88.40:443;transport=ws" 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            xmlns:dm="urn:ietf:params:xml:ns:pidf:data-model" 
            xmlns:rpid="urn:ietf:params:xml:ns:pidf:rpid">
            <note>Ready</note>
            <tuple id="300">
                <status>
                    <basic>open</basic>
                </status>
                <contact priority="1">sip:User1@raspberrypi.local</contact>
            </tuple>
            <dm:person />
        </presence>
        */

        var xml = $($.parseXML(notification.request.body));

        var Entity = xml.find("presence").attr("entity");
        var Contact = xml.find("presence").find("tuple").find("contact").text();
        if (SipUsername == Entity.split("@")[0].split(":")[1] || SipUsername == Contact.split("@")[0].split(":")[1]){
            // Message is for you.
        } 
        else {
            console.warn("presence message not for you.", xml);
            return;
        }

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
            buddyObj.devState = dotClass;
            buddyObj.presence = friendlyState;

            if (friendlyState == "Not online") friendlyState = lang.state_not_online;
            if (friendlyState == "Ready") friendlyState = lang.state_ready;
            if (friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
            if (friendlyState == "Ringing") friendlyState = lang.state_ringing;
            if (friendlyState == "On hold") friendlyState = lang.state_on_hold;
            if (friendlyState == "Unavailable") friendlyState = lang.state_unavailable;
            $("#contact-" + buddyObj.identity + "-presence").html(friendlyState);
            $("#contact-" + buddyObj.identity + "-presence-main").html(friendlyState);
        }
    }
    else if (ContentType == "application/dialog-info+xml")
    {
        // Handle "Dialog" State

        var xml = $($.parseXML(notification.request.body));

        /*
        <?xml version="1.0"?>
        <dialog-info 
            xmlns="urn:ietf:params:xml:ns:dialog-info" 
            version="0-99999" 
            state="full|partial" 
            entity="sip:xxxx@XXX.XX.XX.XX">
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
            buddyObj.devState = dotClass;
            buddyObj.presence = friendlyState;

            if (friendlyState == "Unknown") friendlyState = lang.state_unknown;
            if (friendlyState == "Not online") friendlyState = lang.state_not_online;
            if (friendlyState == "Ready") friendlyState = lang.state_ready;
            if (friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
            if (friendlyState == "Ringing") friendlyState = lang.state_ringing;
            if (friendlyState == "On hold") friendlyState = lang.state_on_hold;
            if (friendlyState == "Unavailable") friendlyState = lang.state_unavailable;
            $("#contact-" + buddyObj.identity + "-presence").html(friendlyState);
            $("#contact-" + buddyObj.identity + "-presence-main").html(friendlyState);
        }
    }
}
function UnsubscribeAll() {
    console.log("Unsubscribing "+ BlfSubs.length + " subscriptions...");
    for (var blf = 0; blf < BlfSubs.length; blf++) {
        BlfSubs[blf].unsubscribe();
        BlfSubs[blf].close();
    }
    BlfSubs = new Array();

    for(var b=0; b<Buddies.length; b++) {
        var buddyObj = Buddies[b];
        if(buddyObj.type == "extension") {
            $("#contact-" + buddyObj.identity + "-devstate").prop("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", "dotOffline");
            $("#contact-" + buddyObj.identity + "-presence").html(lang.state_unknown);
            $("#contact-" + buddyObj.identity + "-presence-main").html(lang.state_unknown);
        }
    }
}
function UnsubscribeBuddy(buddyObj) {
    if(buddyObj.type != "extension") return;

    for (var blf = 0; blf < BlfSubs.length; blf++) {
        var blfObj = BlfSubs[blf];
        if(blfObj.data.buddyId == buddyObj.identity){
        console.log("Unsubscribing:", buddyObj.identity);
            if(blfObj.dialog != null){
                blfObj.unsubscribe();
                blfObj.close();
            }
            BlfSubs.splice(blf, 1);
            break;
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
    if(message == "") {
        Alert(lang.alert_empty_text_message, lang.no_message);
        return;
    }
    // Note: AMI has this limit, but only if you use AMI to transmit
    // if(message.length > 755){
    //     Alert("Asterisk has a limit on the message size (755). This message is too long, and connot be delivered.", "Message Too Long");
    //     return;
    // }

    var messageId = uID();
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj.type == "extension" || buddyObj.type == "group") {
        var chatBuddy = buddyObj.ExtNo + "@" + wssServer;
        console.log("MESSAGE: "+ chatBuddy + " (extension)");
        var messageObj = userAgent.message(chatBuddy, message);
        messageObj.data.messageId = messageId;
        messageObj.on("accepted", function (response, cause){
            if(response.status_code == 202) {
                console.log("Message Accepted:", messageId);

                // Update DB
                var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                if(currentStream != null || currentStream.DataCollection != null){
                    $.each(currentStream.DataCollection, function (i, item) {
                        if (item.ItemType == "MSG" && item.ItemId == messageId) {
                            // Found
                            item.Sent = true;
                            return false;
                        }
                    });
                    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

                    RefreshStream(buddyObj);
                }
            } else {
                console.warn("Message Error", response.status_code, cause);

                // Update DB
                var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                if(currentStream != null || currentStream.DataCollection != null){
                    $.each(currentStream.DataCollection, function (i, item) {
                        if (item.ItemType == "MSG" && item.ItemId == messageId) {
                            // Found
                            item.Sent = false;
                            return false;
                        }
                    });
                    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

                    RefreshStream(buddyObj);
                }                
            }
        });
    } 

    // Update Stream
    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss UTC");
    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitinaliseStream(buddy);

    // Add New Message
    var newMessageJson = {
        ItemId: messageId,
        ItemType: "MSG",
        ItemDate: DateTime,
        SrcUserId: profileUserID,
        Src: "\""+ profileName +"\" <"+ profileUser +">",
        DstUserId: buddy,
        Dst: "",
        MessageData: message
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    // Post Add Activity
    $("#contact-" + buddy + "-ChatMessage").val("");
    $("#contact-" + buddy + "-dictate-message").hide();
    $("#contact-" + buddy + "-emoji-menu").hide();

    if(buddyObj.recognition != null){
        buddyObj.recognition.abort();
        buddyObj.recognition = null;
    }

    ClearChatPreview(buddy);
    UpdateBuddyActivity(buddy);
    RefreshStream(buddyObj);
}
function ReceiveMessage(message) {
    var callerID = message.remoteIdentity.displayName;
    var did = message.remoteIdentity.uri.user;

    console.log("New Incoming Message!", "\""+ callerID +"\" <"+ did +">");

    if(did.length > DidLength) {
        // Contacts cannot receive Test Messages, because they cannot reply
        // This may change with FAX, Email, WhatsApp etc
        console.warn("DID length greater then extensions length")
        return;
    }

    var CurrentCalls = userAgent.sessions.length;

    var buddyObj = FindBuddyByDid(did);
    // Make new contact of its not there
    if(buddyObj == null) {
        var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
        if(json == null) json = InitUserBuddies();

        // Add Extension
        var id = uID();
        var dateNow = utcDateNow();
        json.DataCollection.push({
            Type: "extension",
            LastActivity: dateNow,
            ExtensionNumber: did,
            MobileNumber: "",
            ContactNumber1: "",
            ContactNumber2: "",
            uID: id,
            cID: null,
            gID: null,
            DisplayName: callerID,
            Position: "",
            Description: "", 
            Email: "",
            MemberCount: 0
        });
        buddyObj = new Buddy("extension", id, callerID, did, "", "", "", dateNow, "", "");
        AddBuddy(buddyObj, true, (CurrentCalls==0), true);

        // Update Size: 
        json.TotalRows = json.DataCollection.length;

        // Save To DB
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }

    var origionalMessage = message.body;
    var formattedMessage = ReformatMessage(origionalMessage); // Check if its Json ??
    var messageId = uID();
    var DateTime = utcDateNow();

    // Get the actual Person sending (since all group messages come from the group)
    var ActualSender = "";
    if(buddyObj.type == "group") {
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
        ItemId: messageId,
        ItemType: "MSG",
        ItemDate: DateTime,
        SrcUserId: buddyObj.identity,
        Src: "\""+ buddyObj.CallerIDName +"\" <"+ buddyObj.ExtNo +">",
        DstUserId: profileUserID,
        Dst: "",
        MessageData: origionalMessage
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

    // Update Last Activity
    // ====================
    UpdateBuddyActivity(buddyObj.identity);
    RefreshStream(buddyObj);

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
                var inComingChatNotification = new Notification(lang.message_from + " : " + buddyObj.CallerIDName, noticeOptions);
                inComingChatNotification.onclick = function (event) {
                    // Show Message
                    SelectBuddy(buddyObj.identity);
                }
            }
        }
        // Play Alert
        var rinnger = new Audio();
        rinnger.loop = false;
        rinnger.oncanplaythrough = function(e) {
            if (typeof rinnger.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                rinnger.setSinkId(getRingerOutputID()).then(function() {
                    console.log("Set sinkId to:", getRingerOutputID());
                }).catch(function(e){
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
            // If there has been no interaction with the page at all... this page will not work
            rinnger.play().then(function(){
                // Audio Is Playing
            }).catch(function(e){
                console.warn("Unable to play audio file.", e);
            });
        }
        rinnger.src = hostingPrefex + "Alert.mp3";
        message.data.rinngerObj = rinnger; // Will be attached to this object until its disposed.
    } else {
        // Message window is active.
    }
}
function AddCallMessage(buddy, session, reasonCode, reasonText) {

    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitinaliseStream(buddy);

    var CallEnd = moment.utc(); // Take Now as the Hangup Time
    var callDuration = 0;
    var totalDuration = 0;
    var ringTime = 0;

    var CallStart = moment.utc(session.data.callstart.replace(" UTC", "")); // Actual start (both inbound and outbound)
    var CallAnswer = null; // On Accept when inbound, Remote Side when Outbound
    if(session.startTime){
        // The time when WE answered the call (May be null - no answer)
        // or
        // The time when THEY answered the call (May be null - no answer)
        CallAnswer = moment.utc(session.startTime);  // Local Time gets converted to UTC 

        callDuration = moment.duration(CallEnd.diff(CallAnswer));
        ringTime = moment.duration(CallAnswer.diff(CallStart));
    }
    totalDuration = moment.duration(CallEnd.diff(CallStart));

    var srcId = "";
    var srcCallerID = "";
    var dstId = ""
    var dstCallerID = "";
    if(session.data.calldirection == "inbound") {
        srcId = buddy;
        dstId = profileUserID;
        srcCallerID = "<"+ session.remoteIdentity.uri.user +"> "+ session.remoteIdentity.displayName;
        dstCallerID = "<"+ profileUser+"> "+ profileName;
    } else if(session.data.calldirection == "outbound") {
        srcId = profileUserID;
        dstId = buddy;
        srcCallerID = "<"+ profileUser+"> "+ profileName;
        dstCallerID = session.remoteIdentity.uri.user;
    }

    var callDirection = session.data.calldirection;
    var withVideo = session.data.withvideo;
    var sessionId = session.id;
    var hanupBy = session.data.terminateby;

    var newMessageJson = {
        CdrId: uID(),
        ItemType: "CDR",
        ItemDate: CallStart.format("YYYY-MM-DD HH:mm:ss UTC"),
        CallAnswer: (CallAnswer)? CallAnswer.format("YYYY-MM-DD HH:mm:ss UTC") : null,
        CallEnd: CallEnd.format("YYYY-MM-DD HH:mm:ss UTC"),
        SrcUserId: srcId,
        Src: srcCallerID,
        DstUserId: dstId,
        Dst: dstCallerID,
        RingTime: (ringTime != 0)? ringTime.asSeconds() : 0,
        Billsec: (callDuration != 0)? callDuration.asSeconds() : 0,
        TotalDuration: (totalDuration != 0)? totalDuration.asSeconds() : 0,
        ReasonCode: reasonCode,
        ReasonText: reasonText,
        WithVideo: withVideo,
        SessionId: sessionId,
        CallDirection: callDirection,
        Terminate: hanupBy,
        // CRM
        MessageData: null,
        Tags: [],
        //Reporting
        Transfers: (session.data.transfer)? session.data.transfer : [],
        Mutes: (session.data.mute)? session.data.mute : [],
        Holds: (session.data.hold)? session.data.hold : [],
        Recordings: (session.data.recordings)? session.data.recordings : [],
        ConfCalls: (session.data.confcalls)? session.data.confcalls : [],
        QOS: []
    }

    console.log("New CDR", newMessageJson);

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    UpdateBuddyActivity(buddy);
}
// TODO
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
// TODO
function SendFileDataMessage(buddy, FileDataUrl, fileName, fileSize) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

    var fileID = uID();

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
    var DateTime = utcDateNow();

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

    // Take Out
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json != null) {
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
                item.missed = item.missed +1;
                return false;
            }
        });
        // Put Back
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }

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
    var timeStamp = utcDateNow();
    buddyObj.lastActivity = timeStamp;
    console.log("Last Activity is now: "+ timeStamp);

    // Take Out
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json != null) {
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
                item.LastActivity = timeStamp;
                return false;
            }
        });
        // Put Back
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }

    // List Update
    // ===========
    UpdateBuddyList();
}
function ClearMissedBadge(buddy) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    buddyObj.missed = 0;

    // Take Out
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json != null) {
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
                item.missed = 0;
                return false;
            }
        });
        // Put Back
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }


    $("#contact-" + buddy + "-missed").text(buddyObj.missed);
    $("#contact-" + buddy + "-missed").hide(400);
}

// Outbound Calling
// ================
function VideoCall(lineObj, dialledNumber) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;
    if(lineObj == null) return;

    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        return;
    }

    if(HasVideoDevice == false){
        console.warn("No video devices (webcam) found, switching to audio call.");
        AudioCall(lineObj, dialledNumber);
        return;
    }

    var currentAudioDevice = getAudioSrcID();
    var confirmedAudioDevice = false;
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (currentAudioDevice != "default")? { exact: currentAudioDevice } : "default"
                },
                video: false
            }
        }
    }
    // Configure Audio
    for (var i = 0; i < AudioinputDevices.length; ++i) {
        if(currentAudioDevice != "default" && currentAudioDevice == AudioinputDevices[i].deviceId) {
            confirmedAudioDevice = true;
        }
    }
    // Check Audio devices
    if(currentAudioDevice != "default" && !confirmedAudioDevice) {
        console.warn("The audio device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        localDB.setItem("AudioSrcId", "default"); // resets for later and subsequent calls
    }
    // Additional Constaints
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Configure Video
    var currentVideoDevice = getVideoSrcID();
    var confirmedVideoDevice = false;
    for (var i = 0; i < VideoinputDevices.length; ++i) {
        if(currentVideoDevice != "default" && currentVideoDevice == VideoinputDevices[i].deviceId) {
            confirmedVideoDevice = true;
        }
    }
    // The user has a camera
    spdOptions.sessionDescriptionHandlerOptions.constraints.video =  {deviceId: (currentVideoDevice != "default")?  { exact: currentVideoDevice } : "default" }
    // Check Video devices
    if(currentVideoDevice != "default" && !confirmedVideoDevice) {
        console.warn("The video device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = "default";
        localDB.setItem("VideoSrcId", "default"); // resets for later and subsequent calls
    }
    // Add additional Constraints
    if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
    if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
    if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.starting_video_call);
    $("#line-" + lineObj.LineNumber + "-timer").show();

    // Invite
    console.log("INVITE (video): " + dialledNumber + "@" + wssServer);
    lineObj.SipSession = userAgent.invite("sip:" + dialledNumber + "@" + wssServer, spdOptions);

    var startTime = moment.utc();
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    lineObj.SipSession.data.calldirection = "outbound";
    lineObj.SipSession.data.dst = dialledNumber;
    lineObj.SipSession.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    lineObj.SipSession.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime)); 
        $("#line-" + lineObj.LineNumber + "-timer").html(formatShortDuration(duration.asSeconds()));
    }, 1000);
    lineObj.SipSession.data.VideoSourceDevice = getVideoSrcID();
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();
    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.withvideo = true;

    // Do Nessesary UI Wireup
    wireupVideoSession(lineObj);
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
            {id: 1, name: "<i class=\"fa fa-phone-square\"></i> "+ lang.call_extension, number: buddyObj.ExtNo},
        ];
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") items.push({id: 2, name: "<i class=\"fa fa-mobile\"></i> "+ lang.call_mobile, number: buddyObj.MobileNumber});
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") items.push({id: 3, name: "<i class=\"fa fa-phone\"></i> "+ lang.call_number, number: buddyObj.ContactNumber1});
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") items.push({id: 4, name: "<i class=\"fa fa-phone\"></i> "+ lang.call_number, number: buddyObj.ContactNumber2});
        dhtmlxPopup.attachList("name,number", items);
        dhtmlxPopup.attachEvent("onClick", function(id){
            var NumberToDial = dhtmlxPopup.getItemData(id).number;
            console.log("Menu click AudioCall("+ buddy +", "+ NumberToDial +")");
            dhtmlxPopup.hide();
            DialByLine("audio", buddy, NumberToDial);
        });
    } else if(buddyObj.type == "contact") {
        // Contact
        var items = [];
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") items.push({id: 1, name: "<i class=\"fa fa-mobile\"></i> "+ lang.call_mobile, number: buddyObj.MobileNumber});
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") items.push({id: 2, name: "<i class=\"fa fa-phone\"></i> "+ lang.call_number, number: buddyObj.ContactNumber1});
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") items.push({id: 3, name: "<i class=\"fa fa-phone\"></i> "+ lang.call_number, number: buddyObj.ContactNumber2});
        dhtmlxPopup.attachList("name,number", items);
        dhtmlxPopup.attachEvent("onClick", function(id){
            var NumberToDial = dhtmlxPopup.getItemData(id).number;
            console.log("Menu click AudioCall("+ buddy +", "+ NumberToDial +")");
            dhtmlxPopup.hide();
            DialByLine("audio", buddy, NumberToDial);
        });
    } else if(buddyObj.type == "group") {
        dhtmlxPopup.attachList("name,number", [
            {id: 1, name: "<i class=\"fa fa-users\"></i> "+ lang.call_group, number: buddyObj.ExtNo }
        ]);
        dhtmlxPopup.attachEvent("onClick", function(id){
            console.log("Menu click AudioCallGroup("+ buddy +")");
            dhtmlxPopup.hide();
            DialByLine("audio", buddy, dhtmlxPopup.getItemData(id).number);
        });
    }
    dhtmlxPopup.show(x, y, w, h);
}
function AudioCall(lineObj, dialledNumber) {
    if(userAgent == null) return;
    if(userAgent.isRegistered() == false) return;
    if(lineObj == null) return;

    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        return;
    }

    var currentAudioDevice = getAudioSrcID();
    var confirmedAudioDevice = false;
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (currentAudioDevice != "default")? { exact: currentAudioDevice } : "default"
                },
                video: false
            }
        }
    }
    for (var i = 0; i < AudioinputDevices.length; ++i) {
        if(currentAudioDevice != "default" && currentAudioDevice == AudioinputDevices[i].deviceId) {
            confirmedAudioDevice = true;
        }
    }
    // Check devices
    if(currentAudioDevice != "default" && !confirmedAudioDevice) {
        console.warn("The audio device you used before is no longer availabe, default settings applied.");
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = "default";
        localDB.setItem("AudioSrcId", "default"); // resets for later and subsequent calls
    }
    // Add additional Constraints
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.starting_audio_call);
    $("#line-" + lineObj.LineNumber + "-timer").show();

    // Invite
    console.log("INVITE (audio): " + dialledNumber + "@" + wssServer);
    lineObj.SipSession = userAgent.invite("sip:" + dialledNumber + "@" + wssServer, spdOptions);

    var startTime = moment.utc();
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    lineObj.SipSession.data.calldirection = "outbound";
    lineObj.SipSession.data.dst = dialledNumber;
    lineObj.SipSession.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    lineObj.SipSession.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime)); 
        $("#line-" + lineObj.LineNumber + "-timer").html(formatShortDuration(duration.asSeconds()));
    }, 1000);
    lineObj.SipSession.data.VideoSourceDevice = null;
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();
    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.withvideo = false;

    // Do Nessesary UI Wireup
    wireupAudioSession(lineObj);
}

// Sessions & During Call Activity
// ===============================
function getSession(buddy) {
    if(userAgent == null) {
        console.warn("userAgent is null");
        return;
    }
    if(userAgent.isRegistered() == false) {
        console.warn("userAgent is not registered");
        return;
    }

    var rtnSession = null;
    $.each(userAgent.sessions, function (i, session) {
        if(session.data.buddyId == buddy) {
            rtnSession = session;
            return false;
        }
    });
    return rtnSession;
}

function StartRecording(lineNum){
    if(CallRecordingPolicy == "disabled") {
        console.warn("Policy Disabled: Call Recording");
        return;
    }
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;

    $("#line-"+ lineObj.LineNumber +"-btn-start-recording").hide();
    $("#line-"+ lineObj.LineNumber +"-btn-stop-recording").show();

    var session = lineObj.SipSession;
    if(session == null){
        console.warn("Could not find session");
        return;
    }

    var id = uID();

    if(!session.data.recordings) session.data.recordings = [];
    session.data.recordings.push({
        uID: id,
        startTime: utcDateNow(),
        stopTime: utcDateNow(),
    });

    if(!session.data.mediaRecorder){
        console.log("Creating call recorder...");

        var recordStream = new MediaStream();
        var pc = session.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                console.log("Adding sender audio track to record:", RTCRtpSender.track.label);
                recordStream.addTrack(RTCRtpSender.track);
            }
        });
        pc.getReceivers().forEach(function (RTCRtpReceiver) {
            if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio") {
                console.log("Adding receiver audio track to record:", RTCRtpReceiver.track.label);
                recordStream.addTrack(RTCRtpReceiver.track);
            }
            if(session.data.withvideo){
                if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "video") {
                    console.log("Adding receiver video track to record:", RTCRtpReceiver.track.label);
                    recordStream.addTrack(RTCRtpReceiver.track);
                }
            }
        });

        // Resample the Video Recording
        if(session.data.withvideo){
            var recordingWidth = 640;
            var recordingHeight = 360;
            var pnpVideSize = 100;
            if(RecordingVideoSize == "HD"){
                recordingWidth = 1280;
                recordingHeight = 720;
                pnpVideSize = 144;
            }
            if(RecordingVideoSize == "FHD"){
                recordingWidth = 1920;
                recordingHeight = 1080;
                pnpVideSize = 240;
            }

            // them-pnp
            var pnpVideo = $("#line-" + lineObj.LineNumber + "-localVideo").get(0);
            var mainVideo = $("#line-" + lineObj.LineNumber + "-remoteVideo").get(0);
            if(RecordingLayout == "us-pnp"){
                pnpVideo = $("#line-" + lineObj.LineNumber + "-remoteVideo").get(0);
                mainVideo = $("#line-" + lineObj.LineNumber + "-localVideo").get(0);
            }
            var recordingCanvas = $('<canvas/>').get(0);
            recordingCanvas.width = (RecordingLayout == "side-by-side")? (recordingWidth * 2) + 5: recordingWidth;
            recordingCanvas.height = recordingHeight;
            var recordingContext = recordingCanvas.getContext("2d");

            window.clearInterval(session.data.recordingRedrawInterval);
            session.data.recordingRedrawInterval = window.setInterval(function(){

                // Main Video
                var videoWidth = (mainVideo.videoWidth > 0)? mainVideo.videoWidth : recordingWidth ;
                var videoHeight = (mainVideo.videoHeight > 0)? mainVideo.videoHeight : recordingHeight ;

                if(videoWidth >= videoHeight){
                    // Landscape / Square
                    var scale = recordingWidth / videoWidth;
                    videoWidth = recordingWidth;
                    videoHeight = videoHeight * scale;
                    if(videoHeight > recordingHeight){
                        var scale = recordingHeight / videoHeight;
                        videoHeight = recordingHeight;
                        videoWidth = videoWidth * scale;
                    }
                } 
                else {
                    // Portrait
                    var scale = recordingHeight / videoHeight;
                    videoHeight = recordingHeight;
                    videoWidth = videoWidth * scale;
                }
                var offsetX = (videoWidth < recordingWidth)? (recordingWidth - videoWidth) / 2 : 0;
                var offsetY = (videoHeight < recordingHeight)? (recordingHeight - videoHeight) / 2 : 0;
                if(RecordingLayout == "side-by-side") offsetX = recordingWidth + 5 + offsetX;

                // Picture-in-Picture Video
                var pnpVideoHeight = pnpVideo.videoHeight;
                var pnpVideoWidth = pnpVideo.videoWidth;
                if(pnpVideoHeight > 0){
                    if(pnpVideoWidth >= pnpVideoHeight){
                        var scale = pnpVideSize / pnpVideoHeight;
                        pnpVideoHeight = pnpVideSize;
                        pnpVideoWidth = pnpVideoWidth * scale;
                    } 
                    else{
                        var scale = pnpVideSize / pnpVideoWidth;
                        pnpVideoWidth = pnpVideSize;
                        pnpVideoHeight = pnpVideoHeight * scale;
                    }
                }
                var pnpOffsetX = 10;
                var pnpOffsetY = 10;
                if(RecordingLayout == "side-by-side"){
                    pnpVideoWidth = pnpVideo.videoWidth;
                    pnpVideoHeight = pnpVideo.videoHeight;
                    if(pnpVideoWidth >= pnpVideoHeight){
                        // Landscape / Square
                        var scale = recordingWidth / pnpVideoWidth;
                        pnpVideoWidth = recordingWidth;
                        pnpVideoHeight = pnpVideoHeight * scale;
                        if(pnpVideoHeight > recordingHeight){
                            var scale = recordingHeight / pnpVideoHeight;
                            pnpVideoHeight = recordingHeight;
                            pnpVideoWidth = pnpVideoWidth * scale;
                        }
                    } 
                    else {
                        // Portrait
                        var scale = recordingHeight / pnpVideoHeight;
                        pnpVideoHeight = recordingHeight;
                        pnpVideoWidth = pnpVideoWidth * scale;
                    }
                    pnpOffsetX = (pnpVideoWidth < recordingWidth)? (recordingWidth - pnpVideoWidth) / 2 : 0;
                    pnpOffsetY = (pnpVideoHeight < recordingHeight)? (recordingHeight - pnpVideoHeight) / 2 : 0;
                }

                // Draw Elements
                recordingContext.fillRect(0, 0, recordingCanvas.width, recordingCanvas.height);
                if(mainVideo.videoHeight > 0){
                    recordingContext.drawImage(mainVideo, offsetX, offsetY, videoWidth, videoHeight);
                }
                if(pnpVideo.videoHeight > 0 && (RecordingLayout == "side-by-side" || RecordingLayout == "us-pnp" || RecordingLayout == "them-pnp")){
                    // Only Draw the Pnp Video when needed
                    recordingContext.drawImage(pnpVideo, pnpOffsetX, pnpOffsetY, pnpVideoWidth, pnpVideoHeight);
                }
            }, Math.floor(1000/RecordingVideoFps));
            var recordingVideoMediaStream = recordingCanvas.captureStream(RecordingVideoFps);
        }

        var mixedAudioVideoRecordStream = new MediaStream();
        mixedAudioVideoRecordStream.addTrack(MixAudioStreams(recordStream).getAudioTracks()[0]);
        if(session.data.withvideo){
            // mixedAudioVideoRecordStream.addTrack(recordStream.getVideoTracks()[0]);
            mixedAudioVideoRecordStream.addTrack(recordingVideoMediaStream.getVideoTracks()[0]);
        }

        var mediaType = "audio/webm";
        if(session.data.withvideo) mediaType = "video/webm";
        var options = {
            mimeType : mediaType
        }
        var mediaRecorder = new MediaRecorder(mixedAudioVideoRecordStream, options);
        mediaRecorder.data = {};
        mediaRecorder.data.id = ""+ id;
        mediaRecorder.data.sessionId = ""+ session.id;
        mediaRecorder.data.buddyId = ""+ lineObj.BuddyObj.identity;
        mediaRecorder.ondataavailable = function(event) {
            console.log("Got Call Recording Data: ", event.data.size +"Bytes", this.data.id, this.data.buddyId, this.data.sessionId);
            // Save the Audio/Video file
            SaveCallRecording(event.data, this.data.id, this.data.buddyId, this.data.sessionId);
        }

        console.log("Starting Call Recording", id);
        session.data.mediaRecorder = mediaRecorder;
        session.data.mediaRecorder.start(); // Safari does not support timeslice
        session.data.recordings[session.data.recordings.length-1].startTime = utcDateNow();

        $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_started);
    }
    else if(session.data.mediaRecorder.state == "inactive") {
        session.data.mediaRecorder.data = {};
        session.data.mediaRecorder.data.id = ""+ id;
        session.data.mediaRecorder.data.sessionId = ""+ session.id;
        session.data.mediaRecorder.data.buddyId = ""+ lineObj.BuddyObj.identity;

        console.log("Starting Call Recording", id);
        session.data.mediaRecorder.start();
        session.data.recordings[session.data.recordings.length-1].startTime = utcDateNow();

        $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_started);
    } 
    else {
        console.warn("Recorder is in an unknow state");
    }
}
function SaveCallRecording(blob, id, buddy, sessionid){
    var indexedDB = window.indexedDB;
    var request = indexedDB.open("CallRecordings");
    request.onerror = function(event) {
        console.error("IndexDB Request Error:", event);
    }
    request.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for IndexDB... probably because of first time use.");
        var IDB = event.target.result;

        // Create Object Store
        if(IDB.objectStoreNames.contains("Recordings") == false){
            var objectStore = IDB.createObjectStore("Recordings", { keyPath: "uID" });
            objectStore.createIndex("sessionid", "sessionid", { unique: false });
            objectStore.createIndex("bytes", "bytes", { unique: false });
            objectStore.createIndex("type", "type", { unique: false });
            objectStore.createIndex("mediaBlob", "mediaBlob", { unique: false });
        }
        else {
            console.warn("IndexDB requested upgrade, but object store was in place");
        }
    }
    request.onsuccess = function(event) {
        console.log("IndexDB connected to CallRecordings");

        var IDB = event.target.result;
        if(IDB.objectStoreNames.contains("Recordings") == false){
            console.warn("IndexDB CallRecordings.Recordings does not exists");
            return;
        }
        IDB.onerror = function(event) {
            console.error("IndexDB Error:", event);
        };
    
        // Prepare data to write
        var data = {
            uID: id,
            sessionid: sessionid,
            bytes: blob.size,
            type: blob.type,
            mediaBlob: blob
        }
        // Commit Transaction
        var transaction = IDB.transaction(["Recordings"], "readwrite");
        var objectStoreAdd = transaction.objectStore("Recordings").add(data);
        objectStoreAdd.onsuccess = function(event) {
            console.log("Call Recording Sucess: ", id, blob.size, blob.type, buddy, sessionid);
        }
    }
}
function StopRecording(lineNum, noConfirm){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    if(noConfirm == true){
        // Called at the end of a caill
        $("#line-"+ lineObj.LineNumber +"-btn-start-recording").show();
        $("#line-"+ lineObj.LineNumber +"-btn-stop-recording").hide();

        if(session.data.mediaRecorder){
            if(session.data.mediaRecorder.state == "recording"){
                console.log("Stopping Call Recording");
                session.data.mediaRecorder.stop();
                session.data.recordings[session.data.recordings.length-1].stopTime = utcDateNow();
                window.clearInterval(session.data.recordingRedrawInterval);

                $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_stopped);
            } 
            else{
                console.warn("Recorder is in an unknow state");
            }
        }
        return;
    } 
    else {
        // User attempts to end call recording
        if(CallRecordingPolicy == "enabled"){
            console.log("Policy Enabled: Call Recording");
        }

        Confirm(lang.confirm_stop_recording, lang.stop_recording, function(){
            $("#line-"+ lineObj.LineNumber +"-btn-start-recording").show();
            $("#line-"+ lineObj.LineNumber +"-btn-stop-recording").hide();
    
            if(session.data.mediaRecorder){
                if(session.data.mediaRecorder.state == "recording"){
                    console.log("Stopping Call Recording");
                    session.data.mediaRecorder.stop();
                    session.data.recordings[session.data.recordings.length-1].stopTime = utcDateNow();
                    window.clearInterval(session.data.recordingRedrawInterval);

                    $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_stopped);
                }
                else{
                    console.warn("Recorder is in an unknow state");
                }
            }
        });
    }
}
function PlayAudioCallRecording(obj, cdrId, uID){
    var container = $(obj).parent();
    container.empty();

    var audioObj = new Audio();
    audioObj.autoplay = false;
    audioObj.controls = true;

    // Make sure you are playing out via the correct device
    var sinkId = getAudioOutputID();
    if (typeof audioObj.sinkId !== 'undefined') {
        audioObj.setSinkId(sinkId).then(function(){
            console.log("sinkId applied: "+ sinkId);
        }).catch(function(e){
            console.warn("Error using setSinkId: ", e);
        });
    } else {
        console.warn("setSinkId() is not possible using this browser.")
    }

    container.append(audioObj);

    // Get Call Recording
    var indexedDB = window.indexedDB;
    var request = indexedDB.open("CallRecordings");
    request.onerror = function(event) {
        console.error("IndexDB Request Error:", event);
    }
    request.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for IndexDB... probably because of first time use.");
    }
    request.onsuccess = function(event) {
        console.log("IndexDB connected to CallRecordings");

        var IDB = event.target.result;
        if(IDB.objectStoreNames.contains("Recordings") == false){
            console.warn("IndexDB CallRecordings.Recordings does not exists");
            return;
        } 

        var transaction = IDB.transaction(["Recordings"]);
        var objectStoreGet = transaction.objectStore("Recordings").get(uID);
        objectStoreGet.onerror = function(event) {
            console.error("IndexDB Get Error:", event);
        };
        objectStoreGet.onsuccess = function(event) {
            $("#cdr-media-meta-size-"+ cdrId +"-"+ uID).html(" Size: "+ formatBytes(event.target.result.bytes));
            $("#cdr-media-meta-codec-"+ cdrId +"-"+ uID).html(" Codec: "+ event.target.result.type);

            // Play
            audioObj.src = window.URL.createObjectURL(event.target.result.mediaBlob);
            audioObj.oncanplaythrough = function(){
                audioObj.play().then(function(){
                    console.log("Playback started");
                }).catch(function(e){
                    console.error("Error playing back file: ", e);
                });
            }
        }
    }
}
function PlayVideoCallRecording(obj, cdrId, uID, buddy){
    var container = $(obj).parent();
    container.empty();

    var videoObj = $("<video>").get(0);
    videoObj.id = "callrecording-video-"+ cdrId;
    videoObj.autoplay = false;
    videoObj.controls = true;
    videoObj.ontimeupdate = function(event){
        $("#cdr-video-meta-width-"+ cdrId +"-"+ uID).html(lang.width + " : "+ event.target.videoWidth +"px");
        $("#cdr-video-meta-height-"+ cdrId +"-"+ uID).html(lang.height +" : "+ event.target.videoHeight +"px");
    }

    var sinkId = getAudioOutputID();
    if (typeof videoObj.sinkId !== 'undefined') {
        videoObj.setSinkId(sinkId).then(function(){
            console.log("sinkId applied: "+ sinkId);
        }).catch(function(e){
            console.warn("Error using setSinkId: ", e);
        });
    } else {
        console.warn("setSinkId() is not possible using this browser.")
    }

    container.append(videoObj);

    // Get Call Recording
    var indexedDB = window.indexedDB;
    var request = indexedDB.open("CallRecordings");
    request.onerror = function(event) {
        console.error("IndexDB Request Error:", event);
    }
    request.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for IndexDB... probably because of first time use.");
    }
    request.onsuccess = function(event) {
        console.log("IndexDB connected to CallRecordings");

        var IDB = event.target.result;
        if(IDB.objectStoreNames.contains("Recordings") == false){
            console.warn("IndexDB CallRecordings.Recordings does not exists");
            return;
        } 

        var transaction = IDB.transaction(["Recordings"]);
        var objectStoreGet = transaction.objectStore("Recordings").get(uID);
        objectStoreGet.onerror = function(event) {
            console.error("IndexDB Get Error:", event);
        }
        objectStoreGet.onsuccess = function(event) {
            $("#cdr-media-meta-size-"+ cdrId +"-"+ uID).html(" Size: "+ formatBytes(event.target.result.bytes));
            $("#cdr-media-meta-codec-"+ cdrId +"-"+ uID).html(" Codec: "+ event.target.result.type);

            // Play
            videoObj.src = window.URL.createObjectURL(event.target.result.mediaBlob);
            videoObj.oncanplaythrough = function(){
                videoObj.scrollIntoViewIfNeeded(false);
                videoObj.play().then(function(){
                    console.log("Playback started");
                }).catch(function(e){
                    console.error("Error playing back file: ", e);
                });

                // Create a Post Image after a second
                if(buddy){
                    window.setTimeout(function(){
                        var canvas = $("<canvas>").get(0);
                        var videoWidth = videoObj.videoWidth;
                        var videoHeight = videoObj.videoHeight;
                        if(videoWidth > videoHeight){
                            // Landscape
                            if(videoHeight > 225){
                                var p = 225 / videoHeight;
                                videoHeight = 225;
                                videoWidth = videoWidth * p;
                            }
                        }
                        else {
                            // Portrait
                            if(videoHeight > 225){
                                var p = 225 / videoWidth;
                                videoWidth = 225;
                                videoHeight = videoHeight * p;
                            }
                        }
                        canvas.width = videoWidth;
                        canvas.height = videoHeight;
                        canvas.getContext('2d').drawImage(videoObj, 0, 0, videoWidth, videoHeight);  
                        canvas.toBlob(function(blob) {
                            var reader = new FileReader();
                            reader.readAsDataURL(blob);
                            reader.onloadend = function() {
                                var Poster = { width: videoWidth, height: videoHeight, posterBase64: reader.result }
                                console.log("Capturing Video Poster...");
    
                                // Update DB
                                var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                                if(currentStream != null || currentStream.DataCollection != null){
                                    $.each(currentStream.DataCollection, function(i, item) {
                                        if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                                            // Found
                                            if(item.Recordings && item.Recordings.length >= 1){
                                                $.each(item.Recordings, function(r, recording) {
                                                    if(recording.uID == uID) recording.Poster = Poster;
                                                });
                                            }
                                            return false;
                                        }
                                    });
                                    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                                    console.log("Capturing Video Poster, Done");
                                }
                            }
                        }, 'image/jpeg', PosterJpegQuality);
                    }, 1000);
                }
            }
        }
    }
}

// Stream Manipulations
// ====================
function MixAudioStreams(MultiAudioTackStream){
    // Takes in a MediaStream with any mumber of audio tracks and mixes them together

    var audioContext = null;
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    }
    catch(e){
        console.warn("AudioContext() not available, cannot record");
        return MultiAudioTackStream;
    }
    var mixedAudioStream = audioContext.createMediaStreamDestination();
    MultiAudioTackStream.getAudioTracks().forEach(function(audioTrack){
        var srcStream = new MediaStream();
        srcStream.addTrack(audioTrack);
        var streamSourceNode = audioContext.createMediaStreamSource(srcStream);
        streamSourceNode.connect(mixedAudioStream);
    });

    return mixedAudioStream.stream;
}

// Call Transfer & Conference
// ============================
function QuickFindBuddy(obj){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();

    var filter = obj.value;
    if(filter == "") return;

    console.log("Find Buddy: ", filter);

    Buddies.sort(function(a, b){
        if(a.CallerIDName < b.CallerIDName) return -1;
        if(a.CallerIDName > b.CallerIDName) return 1;
        return 0;
    });

    dhtmlxPopup = new dhtmlXPopup();

    var visibleItems = 0;
    var menu = [];
    for(var b = 0; b < Buddies.length; b++){
        var buddyObj = Buddies[b];

        // Perform Filter Display
        var display = false;
        if(buddyObj.CallerIDName.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ExtNo.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.Desc.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.MobileNumber.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ContactNumber1.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ContactNumber2.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(display) {
            // Filtered Results
            var iconColor = "#404040";
            if(buddyObj.presence == "Unknown" || buddyObj.presence == "Not online" || buddyObj.presence == "Unavailable") iconColor = "#666666";
            if(buddyObj.presence == "Ready") iconColor = "#3fbd3f";
            if(buddyObj.presence == "On the phone" || buddyObj.presence == "Ringing" || buddyObj.presence == "On hold") iconColor = "#c99606";
            menu.push({ id: b, name: "<b>"+ buddyObj.CallerIDName +"</b>", number: null });
            if(buddyObj.ExtNo != "") menu.push({ id: "e"+b, name: "<i class=\"fa fa-phone-square\" style=\"color:"+ iconColor +"\"></i> "+ lang.extension +" ("+ buddyObj.presence +"): "+ buddyObj.ExtNo, number: buddyObj.ExtNo });
            if(buddyObj.MobileNumber != "") menu.push({ id: "m"+b, name: "<i class=\"fa fa-mobile\"></i> "+ lang.mobile +": "+ buddyObj.MobileNumber, number: buddyObj.MobileNumber });
            if(buddyObj.ContactNumber1 != "") menu.push({ id: "c1"+b, name: "<i class=\"fa fa-phone\"></i> "+ lang.call +": "+ buddyObj.ContactNumber1, number: buddyObj.ContactNumber1 });
            if(buddyObj.ContactNumber2 != "") menu.push({ id: "c2"+b, name: "<i class=\"fa fa-phone\"></i> "+ lang.call +": "+ buddyObj.ContactNumber2, number: buddyObj.ContactNumber2 });
            menu.push(dhtmlxPopup.separator);
            visibleItems++;
        }
        if(visibleItems >= 5) break;
    }

    if(menu.length > 1){
        dhtmlxPopup.attachList("name", menu);
        dhtmlxPopup.attachEvent("onClick", function(id){
            var data = dhtmlxPopup.getItemData(id);
            if(data.number) obj.value = data.number;
        });
        dhtmlxPopup.show(x, y, w, h);
    }
}

// Call Transfer
// =============
function StartTransferSession(lineNum){
    $("#line-"+ lineNum +"-btn-Transfer").hide();
    $("#line-"+ lineNum +"-btn-CancelTransfer").show();

    holdSession(lineNum);
    $("#line-"+ lineNum +"-txt-FindTransferBuddy").val("");
    $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();

    $("#line-"+ lineNum +"-btn-blind-transfer").show();
    $("#line-"+ lineNum +"-btn-attended-transfer").show();
    $("#line-"+ lineNum +"-btn-complete-transfer").hide();
    $("#line-"+ lineNum +"-btn-cancel-transfer").hide();

    $("#line-"+ lineNum +"-transfer-status").hide();

    $("#line-"+ lineNum +"-Transfer").show();
}
function CancelTransferSession(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;
    if(session.data.childsession){
        console.log("Child Transfer call detected:", session.data.childsession.status)
        try{
            if(session.data.childsession.status == SIP.Session.C.STATUS_CONFIRMED){
                session.data.childsession.bye();
            } 
            else{
                session.data.childsession.cancel();
            }
        } catch(e){}
    }

    $("#line-"+ lineNum +"-btn-Transfer").show();
    $("#line-"+ lineNum +"-btn-CancelTransfer").hide();

    unholdSession(lineNum);
    $("#line-"+ lineNum +"-Transfer").hide();
}
function BlindTransfer(lineNum) {
    var dstNo = $("#line-"+ lineNum +"-txt-FindTransferBuddy").val().replace(/[^0-9\*\#\+]/g,'');
    if(dstNo == ""){
        console.warn("Cannot transfer, must be [0-9*+#]");
        return;
    }

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;

    if(!session.data.transfer) session.data.transfer = [];
    session.data.transfer.push({ 
        type: "Blind", 
        to: dstNo, 
        transferTime: utcDateNow(), 
        disposition: "refer",
        dispositionTime: utcDateNow(), 
        accept : {
            complete: null,
            eventTime: null,
            disposition: ""
        }
    });
    var transferid = session.data.transfer.length-1;

    var transferOptions  = { 
        receiveResponse: function doReceiveResponse(response){
            console.log("Blind transfer response: ", response.reason_phrase);

            session.data.terminateby = "refer";
            session.data.transfer[transferid].accept.disposition = response.reason_phrase;
            session.data.transfer[transferid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html("Call Blind Transfered (Accepted)");
        }
    }
    console.log("REFER: ", dstNo + "@" + wssServer);
    session.refer("sip:" + dstNo + "@" + wssServer, transferOptions);
    $("#line-" + lineNum + "-msg").html(lang.call_blind_transfered);
}
function AttendedTransfer(lineNum){
    var dstNo = $("#line-"+ lineNum +"-txt-FindTransferBuddy").val().replace(/[^0-9\*\#\+]/g,'');
    if(dstNo == ""){
        console.warn("Cannot transfer, must be [0-9*+#]");
        return;
    }
    
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;

    HidePopup();

    $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().hide();
    $("#line-"+ lineNum +"-btn-blind-transfer").hide();
    $("#line-"+ lineNum +"-btn-attended-transfer").hide();

    $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
    $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
    $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();

    var newCallStatus = $("#line-"+ lineNum +"-transfer-status");
    newCallStatus.html(lang.connecting);
    newCallStatus.show();

    if(!session.data.transfer) session.data.transfer = [];
    session.data.transfer.push({ 
        type: "Attended", 
        to: dstNo, 
        transferTime: utcDateNow(), 
        disposition: "invite",
        dispositionTime: utcDateNow(), 
        accept : {
            complete: null,
            eventTime: null,
            disposition: ""
        }
    });
    var transferid = session.data.transfer.length-1;

    // SDP options
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (session.data.AudioSourceDevice != "default")? { exact: session.data.AudioSourceDevice } : "default"
                },
                video: false
            }
        }
    }
    // Not sure if its possible to transfer a Video call???
    if(session.data.withvideo){
        spdOptions.constraints.video = {
            deviceId: (session.data.VideoSourceDevice != "default")? { exact: session.data.VideoSourceDevice } : "default"
        }
        // Add additional Constraints
        if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
        if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
        if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
    }

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

    // Create new call session
    console.log("INVITE: ", "sip:" + dstNo + "@" + wssServer);
    var newSession = userAgent.invite("sip:" + dstNo + "@" + wssServer, spdOptions);
    session.data.childsession = newSession;
    newSession.on('progress', function (response) {
        newCallStatus.html(lang.ringing);
        session.data.transfer[transferid].disposition = "progress";
        session.data.transfer[transferid].dispositionTime = utcDateNow();

        $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_started);
        
        var CancelAttendedTransferBtn = $("#line-"+ lineNum +"-btn-cancel-attended-transfer");
        CancelAttendedTransferBtn.off('click');
        CancelAttendedTransferBtn.on('click', function(){
            newSession.cancel();
            newCallStatus.html(lang.call_cancelled);
            console.log("New call session canceled");

            session.data.transfer[transferid].accept.complete = false;
            session.data.transfer[transferid].accept.disposition = "cancel";
            session.data.transfer[transferid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_cancelled);
        });
        CancelAttendedTransferBtn.show();
    });
    newSession.on('accepted', function (response) {
        newCallStatus.html(lang.call_in_progress);
        $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
        session.data.transfer[transferid].disposition = "accepted";
        session.data.transfer[transferid].dispositionTime = utcDateNow();

        var CompleteTransferBtn = $("#line-"+ lineNum +"-btn-complete-attended-transfer");
        CompleteTransferBtn.off('click');
        CompleteTransferBtn.on('click', function(){
            var transferOptions  = { 
                receiveResponse: function doReceiveResponse(response){
                    console.log("Attended transfer response: ", response.reason_phrase);

                    session.data.terminateby = "refer";
                    session.data.transfer[transferid].accept.disposition = response.reason_phrase;
                    session.data.transfer[transferid].accept.eventTime = utcDateNow();

                    $("#line-" + lineNum + "-msg").html(lang.attended_transfer_complete_accepted);
                }
            }

            // Send REFER
            session.refer(newSession, transferOptions);

            newCallStatus.html(lang.attended_transfer_complete);
            console.log("Attended transfer complete");
            // Call will now teardown...

            session.data.transfer[transferid].accept.complete = true;
            session.data.transfer[transferid].accept.disposition = "refer";
            session.data.transfer[transferid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html(lang.attended_transfer_complete);
        });
        CompleteTransferBtn.show();

        var TerminateAttendedTransferBtn = $("#line-"+ lineNum +"-btn-terminate-attended-transfer");
        TerminateAttendedTransferBtn.off('click');
        TerminateAttendedTransferBtn.on('click', function(){
            newSession.bye();
            newCallStatus.html(lang.call_ended);
            console.log("New call session end");

            session.data.transfer[transferid].accept.complete = false;
            session.data.transfer[transferid].accept.disposition = "bye";
            session.data.transfer[transferid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_ended);
        });
        TerminateAttendedTransferBtn.show();
    });
    newSession.on('trackAdded', function () {
        var pc = newSession.sessionDescriptionHandler.peerConnection;

        // Gets Remote Audio Track (Local audio is setup via initial GUM)
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track && receiver.track.kind == "audio"){
                remoteStream.addTrack(receiver.track);
            }
        });
        var remoteAudio = $("#line-" + lineNum + "-transfer-remoteAudio").get(0);
        remoteAudio.srcObject = remoteStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(session.data.AudioOutputDevice).then(function(){
                    console.log("sinkId applied: "+ session.data.AudioOutputDevice);
                }).catch(function(e){
                    console.warn("Error using setSinkId: ", e);
                });            
            }
            remoteAudio.play();
        }
    });
    newSession.on('rejected', function (response, cause) {
        console.log("New call session rejected: ", cause);
        newCallStatus.html(lang.call_rejected);
        session.data.transfer[transferid].disposition = "rejected";
        session.data.transfer[transferid].dispositionTime = utcDateNow();

        $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();
        $("#line-"+ lineNum +"-btn-blind-transfer").show();
        $("#line-"+ lineNum +"-btn-attended-transfer").show();

        $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
        $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
        $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();

        $("#line-"+ lineNum +"-msg").html(lang.attended_transfer_call_rejected);

        window.setTimeout(function(){
            newCallStatus.hide();
        }, 1000);
    });
    newSession.on('terminated', function (response, cause) {
        console.log("New call session terminated: ", cause);
        newCallStatus.html(lang.call_ended);
        session.data.transfer[transferid].disposition = "terminated";
        session.data.transfer[transferid].dispositionTime = utcDateNow();

        $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();
        $("#line-"+ lineNum +"-btn-blind-transfer").show();
        $("#line-"+ lineNum +"-btn-attended-transfer").show();

        $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
        $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
        $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();

        $("#line-"+ lineNum +"-msg").html(lang.attended_transfer_call_terminated);

        window.setTimeout(function(){
            newCallStatus.hide();
        }, 1000);
    });
}

// Conference Calls
// ================
function StartConferenceCall(lineNum){
    $("#line-"+ lineNum +"-btn-Conference").hide();
    $("#line-"+ lineNum +"-btn-CancelConference").show();

    holdSession(lineNum);
    $("#line-"+ lineNum +"-txt-FindConferenceBuddy").val("");
    $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();

    $("#line-"+ lineNum +"-btn-conference-dial").show();
    $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
    $("#line-"+ lineNum +"-btn-join-conference-call").hide();
    $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();

    $("#line-"+ lineNum +"-conference-status").hide();

    $("#line-"+ lineNum +"-Conference").show();
}
function CancelConference(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;
    if(session.data.childsession){
        try{
            if(session.data.childsession.status == SIP.Session.C.STATUS_CONFIRMED){
                session.data.childsession.bye();
            } 
            else{
                session.data.childsession.cancel();
            }
        } catch(e){}
    }

    $("#line-"+ lineNum +"-btn-Conference").show();
    $("#line-"+ lineNum +"-btn-CancelConference").hide();

    unholdSession(lineNum);
    $("#line-"+ lineNum +"-Conference").hide();
}
function ConferenceDail(lineNum){
    var dstNo = $("#line-"+ lineNum +"-txt-FindConferenceBuddy").val().replace(/[^0-9\*\#\+]/g,'');
    if(dstNo == ""){
        console.warn("Cannot transfer, must be [0-9*+#]");
        return;
    }
    
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;

    HidePopup();

    $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().hide();

    $("#line-"+ lineNum +"-btn-conference-dial").hide();
    $("#line-"+ lineNum +"-btn-cancel-conference-dial")
    $("#line-"+ lineNum +"-btn-join-conference-call").hide();
    $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();

    var newCallStatus = $("#line-"+ lineNum +"-conference-status");
    newCallStatus.html(lang.connecting);
    newCallStatus.show();

    if(!session.data.confcalls) session.data.confcalls = [];
    session.data.confcalls.push({ 
        to: dstNo, 
        startTime: utcDateNow(), 
        disposition: "invite",
        dispositionTime: utcDateNow(), 
        accept : {
            complete: null,
            eventTime: null,
            disposition: ""
        }
    });
    var confcallid = session.data.confcalls.length-1;

    // SDP options
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: {
                    deviceId: (session.data.AudioSourceDevice != "default")? { exact: session.data.AudioSourceDevice } : "default"
                },
                video: false
            }
        }
    }
    // Unlikely this will work
    if(session.data.withvideo){
        spdOptions.constraints.video = {
            deviceId: (session.data.VideoSourceDevice != "default")? { exact: session.data.VideoSourceDevice } : "default"
        }
        // Add additional Constraints
        if(maxFrameRate != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
        if(videoHeight != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
        if(videoAspectRatio != "") spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
    }

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if(supportedConstraints.autoGainControl) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    if(supportedConstraints.echoCancellation) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    if(supportedConstraints.noiseSuppression) spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;

    // Create new call session
    console.log("INVITE: ", "sip:" + dstNo + "@" + wssServer);
    var newSession = userAgent.invite("sip:" + dstNo + "@" + wssServer, spdOptions);
    session.data.childsession = newSession;
    newSession.on('progress', function (response) {
        newCallStatus.html(lang.ringing);
        session.data.confcalls[confcallid].disposition = "progress";
        session.data.confcalls[confcallid].dispositionTime = utcDateNow();

        $("#line-" + lineNum + "-msg").html(lang.conference_call_started);

        var CancelConferenceDialBtn = $("#line-"+ lineNum +"-btn-cancel-conference-dial");
        CancelConferenceDialBtn.off('click');
        CancelConferenceDialBtn.on('click', function(){
            newSession.cancel();
            newCallStatus.html(lang.call_cancelled);
            console.log("New call session canceled");

            session.data.confcalls[confcallid].accept.complete = false;
            session.data.confcalls[confcallid].accept.disposition = "cancel";
            session.data.confcalls[confcallid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html(lang.canference_call_cancelled);
        });
        CancelConferenceDialBtn.show();
    });
    newSession.on('accepted', function (response) {
        newCallStatus.html(lang.call_in_progress);
        $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
        session.data.confcalls[confcallid].disposition = "accepted";
        session.data.confcalls[confcallid].dispositionTime = utcDateNow();

        // Join Call
        var JoinCallBtn = $("#line-"+ lineNum +"-btn-join-conference-call");
        JoinCallBtn.off('click');
        JoinCallBtn.on('click', function(){
            // Merge Call Audio
            if(!session.data.childsession){
                console.warn("Conference session lost");
                return;
            }

            var outputStreamForSession = new MediaStream();
            var outputStreamForConfSession = new MediaStream();

            var pc = session.sessionDescriptionHandler.peerConnection;
            var confPc = session.data.childsession.sessionDescriptionHandler.peerConnection;

            // Get conf call input channel
            confPc.getReceivers().forEach(function (RTCRtpReceiver) {
                if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio") {
                    console.log("Adding conference session:", RTCRtpReceiver.track.label);
                    outputStreamForSession.addTrack(RTCRtpReceiver.track);
                }
            });

            // Get session input channel
            pc.getReceivers().forEach(function (RTCRtpReceiver) {
                if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio") {
                    console.log("Adding conference session:", RTCRtpReceiver.track.label);
                    outputStreamForConfSession.addTrack(RTCRtpReceiver.track);
                }
            });

            // Replace tracks of Parent Call
            pc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                    console.log("Switching to mixed Audio track on session");

                    session.data.AudioSourceTrack = RTCRtpSender.track;
                    outputStreamForSession.addTrack(RTCRtpSender.track);
                    var mixedAudioTrack = MixAudioStreams(outputStreamForSession).getAudioTracks()[0];
                    mixedAudioTrack.IsMixedTrack = true;

                    RTCRtpSender.replaceTrack(mixedAudioTrack);
                }
            });
            // Replace tracks of Child Call
            confPc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                    console.log("Switching to mixed Audio track on conf call");

                    session.data.childsession.data.AudioSourceTrack = RTCRtpSender.track;
                    outputStreamForConfSession.addTrack(RTCRtpSender.track);
                    var mixedAudioTrackForConf = MixAudioStreams(outputStreamForConfSession).getAudioTracks()[0];
                    mixedAudioTrackForConf.IsMixedTrack = true;

                    RTCRtpSender.replaceTrack(mixedAudioTrackForConf);
                }
            });

            newCallStatus.html(lang.call_in_progress);
            console.log("Conference Call In Progress");

            session.data.confcalls[confcallid].accept.complete = true;
            session.data.confcalls[confcallid].accept.disposition = "join";
            session.data.confcalls[confcallid].accept.eventTime = utcDateNow();

            $("#line-"+ lineNum +"-btn-terminate-conference-call").show();

            $("#line-" + lineNum + "-msg").html(lang.conference_call_in_progress);

            // Take the parent call off hold
            unholdSession(lineNum);

            JoinCallBtn.hide();
        });
        JoinCallBtn.show();

        // End Call
        var TerminateAttendedTransferBtn = $("#line-"+ lineNum +"-btn-terminate-conference-call");
        TerminateAttendedTransferBtn.off('click');
        TerminateAttendedTransferBtn.on('click', function(){
            newSession.bye();
            newCallStatus.html(lang.call_ended);
            console.log("New call session end");

            session.data.confcalls[confcallid].accept.complete = false;
            session.data.confcalls[confcallid].accept.disposition = "bye";
            session.data.confcalls[confcallid].accept.eventTime = utcDateNow();

            $("#line-" + lineNum + "-msg").html(lang.conference_call_ended);
        });
        TerminateAttendedTransferBtn.show();
    });
    newSession.on('trackAdded', function () {

        var pc = newSession.sessionDescriptionHandler.peerConnection;

        // Gets Remote Audio Track (Local audio is setup via initial GUM)
        var remoteStream = new MediaStream();
        pc.getReceivers().forEach(function (receiver) {
            if(receiver.track && receiver.track.kind == "audio"){
                remoteStream.addTrack(receiver.track);
            }
        });
        var remoteAudio = $("#line-" + lineNum + "-conference-remoteAudio").get(0);
        remoteAudio.srcObject = remoteStream;
        remoteAudio.onloadedmetadata = function(e) {
            if (typeof remoteAudio.sinkId !== 'undefined') {
                remoteAudio.setSinkId(session.data.AudioOutputDevice).then(function(){
                    console.log("sinkId applied: "+ session.data.AudioOutputDevice);
                }).catch(function(e){
                    console.warn("Error using setSinkId: ", e);
                });
            }
            remoteAudio.play();
        }
    });
    newSession.on('rejected', function (response, cause) {
        console.log("New call session rejected: ", cause);
        newCallStatus.html(lang.call_rejected);
        session.data.confcalls[confcallid].disposition = "rejected";
        session.data.confcalls[confcallid].dispositionTime = utcDateNow();

        $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();
        $("#line-"+ lineNum +"-btn-conference-dial").show();

        $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
        $("#line-"+ lineNum +"-btn-join-conference-call").hide();
        $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();

        $("#line-" + lineNum + "-msg").html(lang.conference_call_rejected);

        window.setTimeout(function(){
            newCallStatus.hide();
        }, 1000);
    });
    newSession.on('terminated', function (response, cause) {
        console.log("New call session terminated: ", cause);
        newCallStatus.html(lang.call_ended);
        session.data.confcalls[confcallid].disposition = "terminated";
        session.data.confcalls[confcallid].dispositionTime = utcDateNow();

        // Ends the mixed audio, and releases the mic
        if(session.data.childsession.data.AudioSourceTrack && session.data.childsession.data.AudioSourceTrack.kind == "audio"){
            session.data.childsession.data.AudioSourceTrack.stop();
        }
        // Restore Audio Stream is it was changed
        if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
            var pc = session.sessionDescriptionHandler.peerConnection;
            pc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                    RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                        if(session.data.ismute){
                            RTCRtpSender.track.enabled = false;
                        }
                    }).catch(function(){
                        console.error(e);
                    });
                    session.data.AudioSourceTrack = null;
                }
            });
        }
        $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();
        $("#line-"+ lineNum +"-btn-conference-dial").show();

        $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
        $("#line-"+ lineNum +"-btn-join-conference-call").hide();
        $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();

        $("#line-" + lineNum + "-msg").html(lang.conference_call_terminated);

        window.setTimeout(function(){
            newCallStatus.hide();
        }, 1000);
    });
}


function cancelSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    lineObj.SipSession.data.terminateby = "us";

    console.log("Cancelling session : "+ lineNum);
    lineObj.SipSession.cancel();

    $("#line-" + lineNum + "-msg").html(lang.call_cancelled);
}
function holdSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    console.log("Putting Call on hold: "+ lineNum);
    if(lineObj.SipSession.local_hold == false){
        lineObj.SipSession.hold();
    }
    // Log Hold
    if(!lineObj.SipSession.data.hold) lineObj.SipSession.data.hold = [];
    lineObj.SipSession.data.hold.push({ event: "hold", eventTime: utcDateNow() });

    $("#line-" + lineNum + "-btn-Hold").hide();
    $("#line-" + lineNum + "-btn-Unhold").show();
    $("#line-" + lineNum + "-msg").html(lang.call_on_hold);
}
function unholdSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    console.log("Taking call off hold: "+ lineNum);
    if(lineObj.SipSession.local_hold == true){
        lineObj.SipSession.unhold();
    }
    // Log Hold
    if(!lineObj.SipSession.data.hold) lineObj.SipSession.data.hold = [];
    lineObj.SipSession.data.hold.push({ event: "unhold", eventTime: utcDateNow() });

    $("#line-" + lineNum + "-msg").html(lang.call_in_progress);
    $("#line-" + lineNum + "-btn-Hold").show();
    $("#line-" + lineNum + "-btn-Unhold").hide();
}
function endSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    console.log("Ending call with: "+ lineNum);
    lineObj.SipSession.data.terminateby = "us";
    lineObj.SipSession.bye();

    $("#line-" + lineNum + "-msg").html(lang.call_ended);
    $("#line-" + lineNum + "-ActiveCall").hide();
}
function sendDTMF(lineNum, itemStr) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    console.log("Sending DTMF ("+ itemStr +"): "+ lineNum);
    lineObj.SipSession.dtmf(itemStr);

    $("#line-" + lineNum + "-msg").html(lang.send_dtmf + ": "+ itemStr);
}
function switchVideoSource(lineNum, srcId){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-" + lineNum + "-msg").html(lang.switching_video_source);

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

    var pc = session.sessionDescriptionHandler.peerConnection;

    var localStream = new MediaStream();
    navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
        var newMediaTrack = newStream.getVideoTracks()[0];
        // var pc = session.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
                console.log("Switching Video Track : "+ RTCRtpSender.track.label + " to "+ newMediaTrack.label);
                RTCRtpSender.track.stop();
                RTCRtpSender.replaceTrack(newMediaTrack);
                localStream.addTrack(newMediaTrack);
            }
        });
    }).catch(function(e){
        console.error("Error on getUserMedia", e, constraints);
    });

    // Restore Audio Stream is it was changed
    if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                    if(session.data.ismute){
                        RTCRtpSender.track.enabled = false;
                    }
                }).catch(function(){
                    console.error(e);
                });
                session.data.AudioSourceTrack = null;
            }
        });
    }

    // Set Preview
    console.log("Showing as preview...");
    var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
    localVideo.srcObject = localStream;
    localVideo.onloadedmetadata = function(e) {
        localVideo.play();
    }
}
function SendCanvas(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;
    
    $("#line-" + lineNum + "-msg").html(lang.switching_to_canvas);

    // Create scratch Pad
    RemoveScratchpad(lineNum);

    var newCanvas = $('<canvas/>');
    newCanvas.prop("id", "line-" + lineNum + "-scratchpad");
    $("#line-" + lineNum + "-scratchpad-container").append(newCanvas);
    $("#line-" + lineNum + "-scratchpad").css("display", "inline-block");
    $("#line-" + lineNum + "-scratchpad").css("width", "640px"); // SD
    $("#line-" + lineNum + "-scratchpad").css("height", "360px"); // SD
    $("#line-" + lineNum + "-scratchpad").prop("width", 640); // SD
    $("#line-" + lineNum + "-scratchpad").prop("height", 360); // SD
    $("#line-" + lineNum + "-scratchpad-container").show();

    console.log("Canvas for Scratchpad created...");

    scratchpad = new fabric.Canvas("line-" + lineNum + "-scratchpad");
    scratchpad.id = "line-" + lineNum + "-scratchpad";
    scratchpad.backgroundColor = "#FFFFFF";
    scratchpad.isDrawingMode = true;
    scratchpad.renderAll();
    scratchpad.redrawIntrtval = window.setInterval(function(){
        scratchpad.renderAll();
    }, 1000);

    CanvasCollection.push(scratchpad);

    // Get The Canvas Stream
    var canvasMediaStream = $("#line-"+ lineNum +"-scratchpad").get(0).captureStream(25);
    var canvasMediaTrack = canvasMediaStream.getVideoTracks()[0];

    // Switch Tracks
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
            console.log("Switching Track : "+ RTCRtpSender.track.label + " to Scratchpad Canvas");
            RTCRtpSender.track.stop();
            RTCRtpSender.replaceTrack(canvasMediaTrack);
        }
    });

    // Restore Audio Stream is it was changed
    if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                    if(session.data.ismute){
                        RTCRtpSender.track.enabled = false;
                    }
                }).catch(function(){
                    console.error(e);
                });
                session.data.AudioSourceTrack = null;
            }
        });
    }

    // Set Preview
    // ===========
    console.log("Showing as preview...");
    var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
    localVideo.srcObject = canvasMediaStream;
    localVideo.onloadedmetadata = function(e) {
        localVideo.play();
    }
}
function SendVideo(lineNum, src){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-src-camera").prop("disabled", false);
    $("#line-"+ lineNum +"-src-canvas").prop("disabled", false);
    $("#line-"+ lineNum +"-src-desktop").prop("disabled", false);
    $("#line-"+ lineNum +"-src-video").prop("disabled", true);
    $("#line-"+ lineNum +"-src-blank").prop("disabled", false);

    $("#line-" + lineNum + "-msg").html(lang.switching_to_shared_video);

    $("#line-" + lineNum + "-scratchpad-container").hide();
    RemoveScratchpad(lineNum);
    $("#line-"+ lineNum +"-sharevideo").hide();
    $("#line-"+ lineNum +"-sharevideo").get(0).pause();
    $("#line-"+ lineNum +"-sharevideo").get(0).removeAttribute('src');
    $("#line-"+ lineNum +"-sharevideo").get(0).load();

    $("#line-"+ lineNum +"-localVideo").hide();
    $("#line-"+ lineNum +"-remoteVideo").appendTo("#line-" + lineNum + "-preview-container");

    // Create Video Object
    var newVideo = $("#line-" + lineNum + "-sharevideo");
    newVideo.prop("src", src);
    newVideo.off("loadedmetadata");
    newVideo.on("loadedmetadata", function () {
        console.log("Video can play now... ");

        // Resample Video
        var ResampleSize = 360;
        if(VideoResampleSize == "HD") ResampleSize = 720;
        if(VideoResampleSize == "FHD") ResampleSize = 1080;

        var videoObj = newVideo.get(0);
        var resampleCanvas = $('<canvas/>').get(0);

        var videoWidth = videoObj.videoWidth;
        var videoHeight = videoObj.videoHeight;
        if(videoWidth >= videoHeight){
            // Landscape / Square
            if(videoHeight > ResampleSize){
                var p = ResampleSize / videoHeight;
                videoHeight = ResampleSize;
                videoWidth = videoWidth * p;
            }
        }
        else {
            // Portrate... (phone turned on its side)
            if(videoWidth > ResampleSize){
                var p = ResampleSize / videoWidth;
                videoWidth = ResampleSize;
                videoHeight = videoHeight * p;
            }
        }

        resampleCanvas.width = videoWidth;
        resampleCanvas.height = videoHeight;
        var resampleContext = resampleCanvas.getContext("2d");

        window.clearInterval(session.data.videoResampleInterval);
        session.data.videoResampleInterval = window.setInterval(function(){
            resampleContext.drawImage(videoObj, 0, 0, videoWidth, videoHeight);
        }, 40); // 25frames per second

        // Capture the streams
        var videoMediaStream = null;
        if('captureStream' in videoObj) {
            videoMediaStream = videoObj.captureStream();
        }
        else if('mozCaptureStream' in videoObj) {
            // This doesnt really work?
            // see: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream
            videoMediaStream = videoObj.mozCaptureStream();
        }
        else {
            // This is not supported??.
            // videoMediaStream = videoObj.webkitCaptureStream();
            console.warn("Cannot capture stream from video, this will result in no audio being transmitted.")
        }
        var resampleVideoMediaStream = resampleCanvas.captureStream(25);

        // Get the Tracks
        var videoMediaTrack = resampleVideoMediaStream.getVideoTracks()[0];
        var audioTrackFromVideo = (videoMediaStream != null )? videoMediaStream.getAudioTracks()[0] : null;

        // Switch & Merge Tracks
        var pc = session.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
                console.log("Switching Track : "+ RTCRtpSender.track.label);
                RTCRtpSender.track.stop();
                RTCRtpSender.replaceTrack(videoMediaTrack);
            }
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                console.log("Switching to mixed Audio track on session");
                
                session.data.AudioSourceTrack = RTCRtpSender.track;

                var mixedAudioStream = new MediaStream();
                if(audioTrackFromVideo) mixedAudioStream.addTrack(audioTrackFromVideo);
                mixedAudioStream.addTrack(RTCRtpSender.track);
                var mixedAudioTrack = MixAudioStreams(mixedAudioStream).getAudioTracks()[0];
                mixedAudioTrack.IsMixedTrack = true;

                RTCRtpSender.replaceTrack(mixedAudioTrack);
            }
        });

        // Set Preview
        console.log("Showing as preview...");
        var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
        localVideo.srcObject = videoMediaStream;
        localVideo.onloadedmetadata = function(e) {
            localVideo.play().then(function(){
                console.log("Playing Preview Video File");
            }).catch(function(e){
                console.error("Cannot play back video", e);
            });
        }
        // Play the video
        console.log("Starting Video...");
        $("#line-"+ lineNum +"-sharevideo").get(0).play();
    });

    $("#line-"+ lineNum +"-sharevideo").show();
    console.log("Video for Sharing created...");
}
function ShareScreen(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-" + lineNum + "-msg").html(lang.switching_to_shared_screeen);

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
            var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
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
            var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
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
            console.log("Showing as preview...");
            var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
            localVideo.srcObject = localStream;
            localVideo.onloadedmetadata = function(e) {
                localVideo.play();
            }
        }).catch(function (err) {
            console.error("Error on getUserMedia");
        });
    }

    // Restore Audio Stream is it was changed
    if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                    if(session.data.ismute){
                        RTCRtpSender.track.enabled = false;
                    }
                }).catch(function(){
                    console.error(e);
                });
                session.data.AudioSourceTrack = null;
            }
        });
    }

}
function DisableVideoStream(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;

    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
            console.log("Disable Video Track : "+ RTCRtpSender.track.label + "");
            RTCRtpSender.track.enabled = false; //stop();
        }
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
            if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                    if(session.data.ismute){
                        RTCRtpSender.track.enabled = false;
                    }
                }).catch(function(){
                    console.error(e);
                });
                session.data.AudioSourceTrack = null;
            }
        }
    });

    // Set Preview
    console.log("Showing as preview...");
    var localVideo = $("#line-" + lineNum + "-localVideo").get(0);
    localVideo.pause();
    localVideo.removeAttribute('src');
    localVideo.load();

    $("#line-" + lineNum + "-msg").html(lang.video_disabled);
}

// Phone Lines
// ===========
var Line = function(lineNumber, displayName, displayNumber, buddyObj){
    this.LineNumber = lineNumber;
    this.DisplayName = displayName;
    this.DisplayNumber = displayNumber;
    this.IsSelected = false;
    this.BuddyObj = buddyObj;
    this.SipSession = null;
    this.LocalSoundMeter = null;
    this.RemoteSoundMeter = null;
}
function ShowDial(obj){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
    dhtmlxPopup = new dhtmlXPopup();
    var html = "<div><input id=dialText class=dialTextInput oninput=\"handleDialInput(this, event)\" style=\"width:160px; margin-top:15px\"></div>";
    html += "<table cellspacing=10 cellpadding=0 style=\"margin-left:auto; margin-right: auto\">";
    html += "<tr><td><button class=dtmfButtons onclick=\"KeyPress('1')\">1</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('2')\">2</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('3')\">3</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"KeyPress('4')\">4</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('5')\">5</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('6')\">6</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"KeyPress('7')\">7</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('8')\">8</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('9')\">9</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"KeyPress('*')\">*</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('0')\">0</button></td>"
    html += "<td><button class=dtmfButtons onclick=\"KeyPress('#')\">#</button></td></tr>";
    html += "</table>";
    html += "<div style=\"text-align: center; margin-bottom:15px\">";
    html += "<button class=\"roundButtons dialButtons\" id=dialAudio style=\"width:48px; height:48px;\" title=\""+ lang.audio_call  +"\" onclick=\"DialByLine('audio')\"><i class=\"fa fa-phone\"></i></button>";
    html += "<button class=\"roundButtons dialButtons\" id=dialVideo style=\"width:48px; height:48px; margin-left:20px\" title=\""+ lang.video_call +"\" onclick=\"DialByLine('video')\"><i class=\"fa fa-video-camera\"></i></button>";
    html += "</div>";

    dhtmlxPopup.attachHTML(html);
    dhtmlxPopup.show(x, y, w, h);
}
function handleDialInput(obj, event){
    $("#dialText").val($("#dialText").val().replace(/[^\d\*\#\+]/g, "").substring(0,MaxDidLength));
    $("#dialVideo").prop('disabled', ($("#dialText").val().length >= DidLength));
}
function KeyPress(num){
    $("#dialText").val(($("#dialText").val()+num).substring(0,MaxDidLength));
    $("#dialVideo").prop('disabled', ($("#dialText").val().length >= DidLength));
}
function DialByLine(type, buddy, numToDial){
    var numDial = (numToDial)? numToDial : $("#dialText").val();
    numDial = numDial.replace(/[^\d\*\#\+]/g, "").substring(0,MaxDidLength)
    if(numDial.length == 0) {
        console.warn("Enter number to dial");
        return;
    }

    // Create a Buddy if one is not already existing
    var buddyObj = (buddy)? FindBuddyByIdentity(buddy) : FindBuddyByDid(numDial);
    if(buddyObj == null) {
        var buddyType = (numDial.length > DidLength)? "contact" : "extension";
        // Assumption but anyway: If the number starts with a * or # then its probably not a subscribable did,  
        // and is probably a feature code.
        if(buddyType.substring(0,1) == "*" || buddyType.substring(0,1) == "#") buddyType = "contact";
        buddyObj = MakeBuddy(buddyType, true, false, true, numDial, numDial);
    }

    // Create a Line
    var newLineNumber = Lines.length + 1;
    lineObj = new Line(newLineNumber, numDial, numDial, buddyObj);
    Lines.push(lineObj);
    AddLineHtml(lineObj);
    SelectLine(newLineNumber);
    UpdateBuddyList();

    // Start Call Invite
    if(type == "audio"){
        AudioCall(lineObj, numDial);
    } 
    else {
        VideoCall(lineObj, numDial);
    }
}
function SelectLine(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;
    
    for(var l = 0; l < Lines.length; l++) {
        if(Lines[l].IsSelected == true && Lines[l].LineNumber == lineObj.LineNumber){
            // Nothing to do, you re-selected the same buddy;
            return;
        }
    }

    console.log("Selecting Line : "+ lineObj.LineNumber);

    // Can only display one thing on the Right
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });
    $("#line-ui-" + lineObj.LineNumber).prop('class', 'streamSelected');

    // Switch the SIP Sessions
    SwitchLines(lineObj.LineNumber);

    // Update Lines List
    for(var l = 0; l < Lines.length; l++) {
        var classStr = (Lines[l].LineNumber == lineObj.LineNumber)? "buddySelected" : "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.local_hold)? "buddyActiveCallHollding" : "buddyActiveCall";

        // Apply CSS
        $("#line-" + Lines[l].LineNumber).prop('class', classStr);
        Lines[l].IsSelected = (Lines[l].LineNumber == lineObj.LineNumber);
    }
    // Update Buddy List
    for(var b = 0; b < Buddies.length; b++) {
        $("#contact-" + Buddies[b].identity).prop("class", "buddy");
        Buddies[b].IsSelected = false;
    }

    // Change to Stream if in Narrow view
    UpdateUI();
}
function FindLineByNumber(lineNum) {
    for(var l = 0; l < Lines.length; l++) {
        if(Lines[l].LineNumber == lineNum) return Lines[l];
    }
    return null;
}
function AddLineHtml(lineObj){
    var html = "<table id=\"line-ui-"+ lineObj.LineNumber +"\" class=stream cellspacing=5 cellpadding=0>";
    html += "<tr><td class=streamSection style=\"height: 48px;\">";

    // Close|Return|Back Button
    html += "<div style=\"float:left; margin:0px; padding:5px; height:38px; line-height:38px\">"
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-back\" onclick=\"CloseLine('"+ lineObj.LineNumber +"')\" class=roundButtons title=\""+ lang.back +"\"><i class=\"fa fa-chevron-left\"></i></button> ";
    html += "</div>"

    // Profile UI
    html += "<div class=contact style=\"float: left;\">";
    html += "<div class=lineIcon>"+ lineObj.LineNumber +"</div>";
    html += "<div class=contactNameText><i class=\"fa fa-phone\"></i> "+ lang.line +" "+ lineObj.LineNumber +"</div>";
    html += "<div class=presenceText>"+ lineObj.DisplayName +" <"+ lineObj.DisplayNumber +"></div>";
    html += "</div>";

    // Action Buttons
    html += "<div style=\"float:right; line-height: 46px;\">";
    // html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-videoCall\" onclick=\"VideoCall('"+ lineObj.LineNumber+"')\" class=roundButtons title=\""+ lang.video_call +"\"><i class=\"fa fa-video-camera\"></i></button> ";
    html += "</div>";

    // Separator --------------------------------------------------------------------------
    html += "<div style=\"clear:both; height:0px\"></div>"

    // Calling UI --------------------------------------------------------------------------
    html += "<div id=\"line-"+ lineObj.LineNumber +"-calling\">";

    // Gneral Messages
    html += "<div id=\"line-"+ lineObj.LineNumber +"-timer\" style=\"float: right; margin-top: 5px; margin-right: 10px; display:none;\"></div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-msg\" class=callStatus style=\"display:none\">...</div>";

    // Dialing Out Progress
    html += "<div id=\"line-"+ lineObj.LineNumber +"-progress\" style=\"display:none; margin-top: 10px\">";
    html += "<div class=progressCall>";
    html += "<button onclick=\"cancelSession('"+ lineObj.LineNumber +"')\" class=hangupButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel +"</button>";
    html += "</div>";
    html += "</div>";

    // Active Call UI
    html += "<div id=\"line-"+ lineObj.LineNumber +"-ActiveCall\" style=\"display:none; margin-top: 10px;\">";

    // Group Call
    html += "<div id=\"line-"+ lineObj.LineNumber +"-conference\" style=\"display:none\"></div>";

    // Video UI
    if(lineObj.BuddyObj.type == "extension") {
        html += "<div id=\"line-"+ lineObj.LineNumber +"-VideoCall\" class=videoCall style=\"display:none\">";

        // Presentation
        html += "<div style=\"height:35px; line-height:35px; text-align: right\">"+ lang.present +": ";
        html += "<div class=pill-nav style=\"border-color:#333333\">";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-src-camera\" onclick=\"PresentCamera('"+ lineObj.LineNumber +"')\" title=\""+ lang.camera +"\" disabled><i class=\"fa fa-video-camera\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-src-canvas\" onclick=\"PresentScratchpad('"+ lineObj.LineNumber +"')\" title=\""+ lang.scratchpad +"\"><i class=\"fa fa-pencil-square\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-src-desktop\" onclick=\"PresentScreen('"+ lineObj.LineNumber +"')\" title=\""+ lang.screen +"\"><i class=\"fa fa-desktop\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-src-video\" onclick=\"PresentVideo('"+ lineObj.LineNumber +"')\" title=\""+ lang.video +"\"><i class=\"fa fa-file-video-o\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-src-blank\" onclick=\"PresentBlank('"+ lineObj.LineNumber +"')\" title=\""+ lang.blank +"\"><i class=\"fa fa-ban\"></i></button>";
        html += "</div>";
        html += "&nbsp;<button id=\"line-"+ lineObj.LineNumber +"-expand\" onclick=\"ExpandVideoArea('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-expand\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-restore\" onclick=\"RestoreVideoArea('"+ lineObj.LineNumber +"')\" style=\"display:none\"><i class=\"fa fa-compress\"></i></button>";
        html += "</div>";

        // Preview
        html += "<div id=\"line-"+ lineObj.LineNumber +"-preview-container\" class=PreviewContainer>";
        html += "<video id=\"line-"+ lineObj.LineNumber +"-localVideo\" muted></video>"; // Default Display
        html += "</div>";

        // Stage
        html += "<div id=\"line-"+ lineObj.LineNumber +"-stage-container\" class=StageContainer>";
        html += "<video id=\"line-"+ lineObj.LineNumber +"-remoteVideo\" muted></video>"; // Default Display
        html += "<div id=\"line-"+ lineObj.LineNumber +"-scratchpad-container\" style=\"display:none\"></div>";
        html += "<video id=\"line-"+ lineObj.LineNumber +"-sharevideo\" controls muted style=\"display:none\"></video>";
        html += "</div>";

        html += "</div>";
    }

    // Audio Call
    html += "<div id=\"line-"+ lineObj.LineNumber +"-AudioCall\" style=\"display:none;\">";
    html += "<audio id=\"line-"+ lineObj.LineNumber+"-remoteAudio\"></audio>";
    html += "</div>";

    // In Call Buttons
    html += "<div style=\"text-align:center\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-ShowDtmf\" onclick=\"ShowDtmfMenu(this, '"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.show_key_pad +"\"><i class=\"fa fa-keyboard-o\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Mute\" onclick=\"MuteSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.mute +"\"><i class=\"fa fa-microphone-slash\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Unmute\" onclick=\"UnmuteSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.unmute +"\" style=\"color: red; display:none\"><i class=\"fa fa-microphone\"></i></button>";
    if(typeof MediaRecorder != "undefined" && (CallRecordingPolicy == "allow" || CallRecordingPolicy == "enabled")){
        // Safari: must enable in Develop > Experimental Features > MediaRecorder
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-start-recording\" onclick=\"StartRecording('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.start_call_recording +"\"><i class=\"fa fa-dot-circle-o\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-stop-recording\" onclick=\"StopRecording('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.stop_call_recording +"\" style=\"color: red; display:none\"><i class=\"fa fa-circle\"></i></button>";
    }
    if(EnableTransfer){
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Transfer\" onclick=\"StartTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.transfer_call +"\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber+"-btn-CancelTransfer\" onclick=\"CancelTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.cancel_transfer +"\" style=\"color: red; display:none\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
    }
    if(EnableConference){
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Conference\" onclick=\"StartConferenceCall('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.conference_call +"\"><i class=\"fa fa-users\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-CancelConference\" onclick=\"CancelConference('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.cancel_conference +"\" style=\"color: red; display:none\"><i class=\"fa fa-users\"></i></button>";
    }
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Hold\" onclick=\"holdSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\"  title=\""+ lang.hold_call +"\"><i class=\"fa fa-pause-circle\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Unhold\" onclick=\"unholdSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons\" title=\""+ lang.resume_call +"\" style=\"color: red; display:none\"><i class=\"fa fa-play-circle\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-End\" onclick=\"endSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons inCallButtons hangupButton\" title=\""+ lang.end_call +"\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i></button>";
    html += "</div>";
    // Call Transfer
    html += "<div id=\"line-"+ lineObj.LineNumber +"-Transfer\" style=\"display:none\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<span class=searchClean><input id=\"line-"+ lineObj.LineNumber +"-txt-FindTransferBuddy\" oninput=\"QuickFindBuddy(this,'"+ lineObj.LineNumber +"')\" type=text autocomplete=none style=\"width:150px;\" autocomplete=none placeholder=\""+ lang.search_or_enter_number +"\"></span>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-blind-transfer\" onclick=\"BlindTransfer('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i> "+ lang.blind_transfer +"</button>"
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-attended-transfer\" onclick=\"AttendedTransfer('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-reply-all\" style=\"transform: rotateY(180deg)\"></i> "+ lang.attended_transfer +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-complete-attended-transfer\" style=\"display:none\"><i class=\"fa fa-reply-all\" style=\"transform: rotateY(180deg)\"></i> "+ lang.complete_transfer +"</buuton>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-cancel-attended-transfer\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel_transfer +"</buuton>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-terminate-attended-transfer\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.end_transfer_call +"</buuton>";
    html += "</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-transfer-status\" class=callStatus style=\"margin-top:10px; display:none\">...</div>";
    html += "<audio id=\"line-"+ lineObj.LineNumber +"-transfer-remoteAudio\" style=\"display:none\"></audio>";
    html += "</div>";
    // Call Conference
    html += "<div id=\"line-"+ lineObj.LineNumber +"-Conference\" style=\"display:none\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<span class=searchClean><input id=\"line-"+ lineObj.LineNumber +"-txt-FindConferenceBuddy\" oninput=\"QuickFindBuddy(this,'"+ lineObj.LineNumber +"')\" type=text autocomplete=none style=\"width:150px;\" autocomplete=none placeholder=\""+ lang.search_or_enter_number +"\"></span>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-conference-dial\" onclick=\"ConferenceDail('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-phone\"></i> "+ lang.call +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-cancel-conference-dial\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel_call +"</buuton>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-join-conference-call\" style=\"display:none\"><i class=\"fa fa-users\"></i> "+ lang.join_conference_call +"</buuton>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-terminate-conference-call\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.end_conference_call +"</buuton>";
    html += "</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-conference-status\" class=callStatus style=\"margin-top:10px; display:none\">...</div>";
    html += "<audio id=\"line-"+ lineObj.LineNumber +"-conference-remoteAudio\" style=\"display:none\"></audio>";
    html += "</div>";
    
    // Monitoring
    html += "<div style=\"margin-top:10px\">";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-microphone\"></i></span> ";
    html += "<span class=meterContainer title=\""+ lang.microphone_levels +"\">";
    html += "<span id=\"line-"+ lineObj.LineNumber +"-Mic\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-volume-up\"></i></span> ";
    html += "<span class=meterContainer title=\""+ lang.speaker_levels +"\">";
    html += "<span id=\"line-"+ lineObj.LineNumber +"-Speaker\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-settings\" onclick=\"ChangeSettings('"+ lineObj.LineNumber +"', this)\"><i class=\"fa fa-cogs\"></i> "+ lang.device_settings +"</button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-call-stats\" onclick=\"ShowCallStats('"+ lineObj.LineNumber +"', this)\"><i class=\"fa fa-area-chart\"></i> "+ lang.call_stats +"</button>";
    html += "</div>";

    html += "<div id=\"line-"+ lineObj.LineNumber +"-AdioStats\" class=\"audioStats cleanScroller\" style=\"display:none\">";
    html += "<div style=\"text-align:right\"><button onclick=\"HideCallStats('"+ lineObj.LineNumber +"', this)\"><i class=\"fa fa-times\"></i></button></div>";
    html += "<fieldset class=audioStatsSet>";
    html += "<legend>"+ lang.send_statistics +"</legend>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioSendBitRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioSendPacketRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "</fieldset>";
    html += "<fieldset class=audioStatsSet>";
    html += "<legend>"+ lang.receive_statistics +"</legend>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveBitRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceivePacketRate\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceivePacketLoss\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveJitter\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "<canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveLevels\" class=audioGraph width=600 height=160 style=\"width:600px; height:160px\"></canvas>";
    html += "</fieldset>";
    html += "</div>";

    html += "</div>";
    html += "</div>";
    html += "</div>";

    html += "</td></tr>";
    html += "<tr><td class=\"streamSection streamSectionBackground\" style=\"background-image:url('"+ hostingPrefex +"wp_1.png')\">";
    
    html += "<div id=\"line-"+ lineObj.LineNumber +"-CallDetails\" class=\"chatHistory cleanScroller\">";
    // In Call Activity
    html += "</div>";

    html += "</td></tr>";
    html += "</table>";

    $("#rightContent").append(html);
}
function RemoveLine(lineObj){
    if(lineObj == null) return;

    for(var l = 0; l < Lines.length; l++) {
        if(Lines[l].LineNumber == lineObj.LineNumber) {
            Lines.splice(l,1);
            break;
        }
    }

    CloseLine(lineObj.LineNumber);
    $("#line-ui-"+ lineObj.LineNumber).remove();

    UpdateBuddyList();
}
function CloseLine(lineNum){
    $(".buddySelected").each(function () {
        $(this).prop('class', 'buddy');
    });
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });

    console.log("Closing Line: "+ lineNum);

    SwitchLines(0);
    selectedLine = null;

    // Change to Stream if in Narrow view
    UpdateUI();

    SelectBuddy(localDB.getItem("SelectedBuddy"));
}
function SwitchLines(lineNum){
    $.each(userAgent.sessions, function (i, session) {
        // All the other calls, not on hold
        if(session.local_hold == false && session.data.line != lineNum) {
            console.log("Putting an active call on hold: Line: "+ session.data.line +" buddy: "+ session.data.buddyId);
            session.hold(); // Check state

            // Log Hold
            if(!session.data.hold) session.data.hold = [];
            session.data.hold.push({ event: "hold", eventTime: utcDateNow() });
        }
        $("#line-" + session.data.line + "-btn-Hold").hide();
        $("#line-" + session.data.line + "-btn-Unhold").show();
        session.data.IsCurrentCall = false;
    });

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj != null && lineObj.SipSession != null) {
        var session = lineObj.SipSession;
        if(session.local_hold == true) {
            console.log("Taking call off hold:  Line: "+ lineNum +" buddy: "+ session.data.buddyId);
            session.unhold();

            // Log Hold
            if(!session.data.hold) session.data.hold = [];
            session.data.hold.push({ event: "unhold", eventTime: utcDateNow() });
        }
        $("#line-" + lineNum + "-btn-Hold").show();
        $("#line-" + lineNum + "-btn-Unhold").hide();
        session.data.IsCurrentCall = true;
    }
    selectedLine = lineNum;
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
    localDB.setItem(profileUserID + "-Buddies", JSON.stringify(template));
    return JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
}
function MakeBuddy(type, update, focus, subscribe, callerID, did){
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json == null) json = InitUserBuddies();

    var buddyObj = null;
    if(type == "contact"){
        var id = uID();
        var dateNow = utcDateNow();
        json.DataCollection.push({
            Type: "contact", 
            LastActivity: dateNow,
            ExtensionNumber: "", 
            MobileNumber: "",
            ContactNumber1: did,
            ContactNumber2: "",
            uID: null,
            cID: id,
            gID: null,
            DisplayName: callerID,
            Position: "",
            Description: "",
            Email: "",
            MemberCount: 0
        });
        buddyObj = new Buddy("contact", id, callerID, "", "", did, "", dateNow, "", "");
        AddBuddy(buddyObj, update, focus);
    }
    else {
        var id = uID();
        var dateNow = utcDateNow();
        json.DataCollection.push({
            Type: "extension",
            LastActivity: dateNow,
            ExtensionNumber: did,
            MobileNumber: "",
            ContactNumber1: "",
            ContactNumber2: "",
            uID: id,
            cID: null,
            gID: null,
            DisplayName: callerID,
            Position: "",
            Description: "", 
            Email: "",
            MemberCount: 0
        });
        buddyObj = new Buddy("extension", id, callerID, did, "", "", "", dateNow, "", "");
        AddBuddy(buddyObj, update, focus, subscribe);
    }
    // Update Size: 
    json.TotalRows = json.DataCollection.length;

    // Save To DB
    localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

    // Return new buddy
    return buddyObj;
}
function AddBuddy(buddyObj, update, focus, subscribe){
    Buddies.push(buddyObj);
    if(update == true) UpdateBuddyList();
    AddBuddyMessageStream(buddyObj);
    if(subscribe == true) SubscribeBuddy(buddyObj);
    if(focus == true) SelectBuddy(buddyObj.identity);
}
function PopulateBuddyList() {
    console.log("Clearing Buddies...");
    Buddies = new Array();
    console.log("Adding Buddies...");
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
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
function UpdateBuddyList(){
    var filter = $("#txtFindBuddy").val();

    $("#myContacts").empty();

    for(var l = 0; l < Lines.length; l++) {
        var classStr = (Lines[l].IsSelected)? "buddySelected" : "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.local_hold)? "buddyActiveCallHollding" : "buddyActiveCall";

        var html = "<div id=\"line-"+ Lines[l].LineNumber +"\" class="+ classStr +" onclick=\"SelectLine('"+ Lines[l].LineNumber +"')\">";
        html += "<div class=lineIcon>"+ Lines[l].LineNumber +"</div>";
        html += "<div class=contactNameText><i class=\"fa fa-phone\"></i> "+ lang.line +" "+ Lines[l].LineNumber +"</div>";
        html += "<div id=\"Line-"+ Lines[l].ExtNo +"-datetime\" class=contactDate>&nbsp;</div>";
        html += "<div class=presenceText>"+ Lines[l].DisplayName +" <"+ Lines[l].DisplayNumber +">" +"</div>";
        html += "</div>";
        $("#myContacts").append(html);
    }

    if(Lines.length > 0 & Buddies.length > 0){
        $("#myContacts").append("<hr style=\"height:1px; background-color:#696969\">");
    }
    
    // Sort and shuffle Buddy List
    // ===========================
    Buddies.sort(function(a, b){
        var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
        var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
        if (aMo.isSameOrAfter(bMo, "second")) {
            return -1;
        } else return 1;
        return 0;
    });


    for(var b = 0; b < Buddies.length; b++) {
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
            displayDateTime = lastActivity.local().format("h:mm:ss A");
        } 
        else {
            displayDateTime = lastActivity.local().format("YYYY-MM-DD");
        }

        var classStr = (buddyObj.IsSelected)? "buddySelected" : "buddy";
        if(buddyObj.type == "extension") { 
            var friendlyState = buddyObj.presence;
            if (friendlyState == "Unknown") friendlyState = lang.state_unknown;
            if (friendlyState == "Not online") friendlyState = lang.state_not_online;
            if (friendlyState == "Ready") friendlyState = lang.state_ready;
            if (friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
            if (friendlyState == "Ringing") friendlyState = lang.state_ringing;
            if (friendlyState == "On hold") friendlyState = lang.state_on_hold;
            if (friendlyState == "Unavailable") friendlyState = lang.state_unavailable;
            // An extension on the same system
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'extension')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-devstate\" class=\""+ buddyObj.devState +"\"></span>";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">"+ buddyObj.missed +"</span>";
            html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity) +"')\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-phone-square\"></i> "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-presence\" class=presenceText>"+ friendlyState +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "contact") { 
            // An Addressbook Contact
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'contact')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\"display:none\">0</span>";
            html += "<div class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"contact") +"')\"></div>";
            html += "<div class=contactNameText><i class=\"fa fa-address-card\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "group"){ 
            // A collection of extensions and contacts
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'group')\">";
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
    for(var b = 0; b < Buddies.length; b++) {
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
    html += "<div style=\"float:left; margin:0px; padding:5px; height:38px; line-height:38px\">"
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-back\" onclick=\"CloseBuddy('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.back +"\"><i class=\"fa fa-chevron-left\"></i></button> ";
    html += "</div>"
    
    // Profile UI
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
    } 
    else if(buddyObj.type == "group") {
        html += "<div class=contactNameText><i class=\"fa fa-users\"></i> "+ buddyObj.CallerIDName +"</div>";
    }
    if(buddyObj.type == "extension") {
        var friendlyState = buddyObj.presence;
        if (friendlyState == "Unknown") friendlyState = lang.state_unknown;
        if (friendlyState == "Not online") friendlyState = lang.state_not_online;
        if (friendlyState == "Ready") friendlyState = lang.state_ready;
        if (friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
        if (friendlyState == "Ringing") friendlyState = lang.state_ringing;
        if (friendlyState == "On hold") friendlyState = lang.state_on_hold;
        if (friendlyState == "Unavailable") friendlyState = lang.state_unavailable;

        html += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText>"+ friendlyState +"</div>";
    } else{
        html += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText>"+ buddyObj.Desc +"</div>";
    }
    html += "</div>";

    // Action Buttons
    html += "<div style=\"float:right; line-height: 46px;\">";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-audioCall\" onclick=\"AudioCallMenu('"+ buddyObj.identity +"', this)\" class=roundButtons title=\""+ lang.audio_call +"\"><i class=\"fa fa-phone\"></i></button> ";
    if(buddyObj.type == "extension") {
        html += "<button id=\"contact-"+ buddyObj.identity +"-btn-videoCall\" onclick=\"DialByLine('video', '"+ buddyObj.identity +"', '"+ buddyObj.ExtNo +"');\" class=roundButtons title=\""+ lang.video_call +"\"><i class=\"fa fa-video-camera\"></i></button> ";
    }
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-search\" onclick=\"FindSomething('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.find_something +"\"><i class=\"fa fa-search\"></i></button> ";
    html += "<button id=\"contact-"+ buddyObj.identity +"-btn-remove\" onclick=\"RemoveBuddy('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.remove +"\"><i class=\"fa fa-trash\"></i></button> ";
    html += "</div>";

    // Separator --------------------------------------------------------------------------
    html += "<div style=\"clear:both; height:0px\"></div>"

    // Calling UI --------------------------------------------------------------------------
    html += "<div id=\"contact-"+ buddyObj.identity +"-calling\">";

    // Gneral Messages
    html += "<div id=\"contact-"+ buddyObj.identity +"-timer\" style=\"float: right; margin-top: 5px; margin-right: 10px; display:none;\"></div>";
    html += "<div id=\"contact-"+ buddyObj.identity +"-msg\" class=callStatus style=\"display:none\">...</div>";

    // Call Answer UI
    html += "<div id=\"contact-"+ buddyObj.identity +"-AnswerCall\" class=answerCall style=\"display:none\">";
    html += "<div>";
    html += "<button onclick=\"AnswerAudioCall('"+ buddyObj.identity +"')\" class=answerButton><i class=\"fa fa-phone\"></i> "+ lang.answer_call +"</button> ";
    if(buddyObj.type == "extension") {
        html += "<button id=\"contact-"+ buddyObj.identity +"-answer-video\" onclick=\"AnswerVideoCall('"+ buddyObj.identity +"')\" class=answerButton><i class=\"fa fa-video-camera\"></i> "+ lang.answer_call_with_video +"</button> ";
    }
    html += "<button onclick=\"RejectCall('"+ buddyObj.identity +"')\" class=hangupButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.reject_call +"</button> ";
    html += "</div>";
    html += "</div>";

    html += "</div>";

    // Search & Related Elements
    html += "<div id=\"contact-"+ buddyObj.identity +"-search\" style=\"margin-top:6px; display:none\">";
    html += "<span class=searchClean style=\"width:100%\"><input type=text style=\"width:90%\" autocomplete=none oninput=SearchStream(this,'"+ buddyObj.identity +"') placeholder=\""+ lang.find_something_in_the_message_stream +"\"></span>";
    html += "</div>";

    html += "</td></tr>";
    html += "<tr><td class=\"streamSection streamSectionBackground\" style=\"background-image:url('"+ hostingPrefex +"wp_1.png')\">";

    html += "<div id=\"contact-"+ buddyObj.identity +"-ChatHistory\" class=\"chatHistory cleanScroller\" ondragenter=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragover=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragleave=\"cancelDragDrop(event, '"+ buddyObj.identity +"')\" ondrop=\"onFileDragDrop(event, '"+ buddyObj.identity +"')\">";
    // Previous Chat messages
    html += "</div>";

    html += "</td></tr>";
    if(buddyObj.type == "extension" || buddyObj.type == "group") {
        html += "<tr><td  class=streamSection style=\"height:80px\">";

        // Send Paste Image
        html += "<div id=\"contact-"+ buddyObj.identity +"-imagePastePreview\" class=sendImagePreview style=\"display:none\" tabindex=0></div>";
        // Preview
        html += "<div id=\"contact-"+ buddyObj.identity +"-msgPreview\" class=sendMessagePreview style=\"display:none\">"
        html += "<table class=sendMessagePreviewContainer cellpadding=0 cellspacing=0><tr>";
        html += "<td style=\"text-align:right\"><div id=\"contact-"+ buddyObj.identity +"-msgPreviewhtml\" class=\"sendMessagePreviewHtml cleanScroller\"></div></td>"
        html += "<td style=\"width:40px\"><button onclick=\"SendChatMessage('"+ buddyObj.identity +"')\" class=\"roundButtons\" title=\"Send\"><i class=\"fa fa-paper-plane\"></i></button></td>"
        html += "</tr></table>";
        html += "</div>";

        // Send File
        html += "<div id=\"contact-"+ buddyObj.identity +"-fileShare\" style=\"display:none\">";
        html += "<input type=file multiple onchange=\"console.log(this)\" />";
        html += "</div>";

        // Send Audio Recording
        html += "<div id=\"contact-"+ buddyObj.identity +"-audio-recording\" style=\"display:none\"></div>";

        // Send Video Recording
        html += "<div id=\"contact-"+ buddyObj.identity +"-video-recording\" style=\"display:none\"></div>";

        // Dictate Message
        html += "<div id=\"contact-"+ buddyObj.identity +"-dictate-message\" style=\"display:none\"></div>";

        // Emoji Menu Bar
        html += "<div id=\"contact-"+ buddyObj.identity +"-emoji-menu\" style=\"display:none\"></div>";

        // =====================================
        // Type Area
        html += "<table class=sendMessageContainer cellpadding=0 cellspacing=0><tr>";
        html += "<td><textarea id=\"contact-"+ buddyObj.identity +"-ChatMessage\" class=\"chatMessage cleanScroller\" placeholder=\""+ lang.type_your_message_here +"\" onkeydown=\"chatOnkeydown(event, this,'"+ buddyObj.identity +"')\" onkeyup=\"chatOnkeyup(event, this,'"+ buddyObj.identity +"')\" oninput=\"chatOnkeyup(event, this,'"+ buddyObj.identity +"')\" onpaste=\"chatOnbeforepaste(event, this,'"+ buddyObj.identity +"')\"></textarea></td>";
        html += "<td style=\"width:40px\"><button onclick=\"AddMenu(this, '"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.menu +"\"><i class=\"fa fa-ellipsis-h\"></i></button></td>";
        html += "</tr></table>";
        
        html += "</td></tr>";
    }
    html += "</table>";

    $("#rightContent").append(html);
}
function RemoveBuddyMessageStream(buddyObj){
    CloseBuddy(buddyObj.identity);

    UpdateBuddyList();

    // Remove Stream
    $("#stream-"+ buddyObj.identity).remove();
    var stream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    localDB.removeItem(buddyObj.identity + "-stream");

    // Remove Buddy
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    var x = 0;
    $.each(json.DataCollection, function (i, item) {
        if(item.uID == buddyObj.identity || item.cID == buddyObj.identity || item.gID == buddyObj.identity){
            x = i;
            return false;
        }
    });
    json.DataCollection.splice(x,1);
    json.TotalRows = json.DataCollection.length;
    localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

    // Remove Images
    localDB.removeItem("img-"+ buddyObj.identity +"-extension");
    localDB.removeItem("img-"+ buddyObj.identity +"-contact");
    localDB.removeItem("img-"+ buddyObj.identity +"-group");

    // Remove Call Recordings
    if(stream && stream.DataCollection && stream.DataCollection.length >= 1){
        DeleteCallRecordings(buddyObj.identity, stream);
    }
}
function DeleteCallRecordings(buddy, stream){
    var indexedDB = window.indexedDB;
    var request = indexedDB.open("CallRecordings");
    request.onerror = function(event) {
        console.error("IndexDB Request Error:", event);
    }
    request.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for IndexDB... probably because of first time use.");
        // If this is the case, there will be no call recordings
    }
    request.onsuccess = function(event) {
        console.log("IndexDB connected to CallRecordings");

        var IDB = event.target.result;
        if(IDB.objectStoreNames.contains("Recordings") == false){
            console.warn("IndexDB CallRecordings.Recordings does not exists");
            return;
        }
        IDB.onerror = function(event) {
            console.error("IndexDB Error:", event);
        };

        // Loop and Delete
        $.each(stream.DataCollection, function (i, item) {
            if (item.Recordings && item.Recordings.length) {
                $.each(item.Recordings, function (i, recording) {
                    console.log("Deleting Call Recording: ", recording.uID);
                    var objectStore = IDB.transaction(["Recordings"], "readwrite").objectStore("Recordings");
                    try{
                        var deleteRequest = objectStore.delete(recording.uID);
                        deleteRequest.onsuccess = function(event) {
                            console.log("Call Recording Deleted: ", recording.uID);
                        }
                    } catch(e){
                        console.log("Call Recording Delete failed: ", e);
                    }
                });
            }
        });
    }
}

function SelectBuddy(buddy) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    for(var b = 0; b < Buddies.length; b++) {
        if(Buddies[b].IsSelected == true && Buddies[b].identity == buddy){
            // Nothing to do, you re-selected the same buddy;
            return;
        }
    }

    console.log("Selecting Buddy: "+ buddy);

    selectedBuddy = buddyObj;

    // Can only display one thing on the Right
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });
    $("#stream-" + buddy).prop('class', 'streamSelected');

    // Update Lines List
    for(var l = 0; l < Lines.length; l++) {
        var classStr = "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.local_hold)? "buddyActiveCallHollding" : "buddyActiveCall";
        $("#line-" + Lines[l].LineNumber).prop('class', classStr);
        Lines[l].IsSelected = false;
    }

    ClearMissedBadge(buddy);
    // Update Buddy List
    for(var b = 0; b < Buddies.length; b++) {
        var classStr = (Buddies[b].identity == buddy)? "buddySelected" : "buddy";
        $("#contact-" + Buddies[b].identity).prop('class', classStr);

        Buddies[b].IsSelected = (Buddies[b].identity == buddy);
    }

    // Change to Stream if in Narrow view
    UpdateUI();
    
    // Refresh Stream
    // console.log("Refreshing Stream for you(" + profileUserID + ") and : " + buddyObj.identity);
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

    console.log("Closing Buddy: "+ buddy);

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
    Confirm(lang.confirm_remove_buddy, lang.remove_buddy, function(){
        for(var b = 0; b < Buddies.length; b++) {
            if(Buddies[b].identity == buddy) {
                RemoveBuddyMessageStream(Buddies[b]);
                UnsubscribeBuddy(Buddies[b])
                Buddies.splice(b, 1);
                break;
            }
        }
        UpdateBuddyList();
    });
}
function FindBuddyByDid(did){
    // Used only in Inboud
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].ExtNo == did || Buddies[b].MobileNumber == did || Buddies[b].ContactNumber1 == did || Buddies[b].ContactNumber2 == did) {
            return Buddies[b];
        }
    }
    return null;
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
function SearchStream(obj, buddy){
    var q = obj.value;

    var buddyObj = FindBuddyByIdentity(buddy);
    if(q == ""){
        console.log("Restore Stream");
        RefreshStream(buddyObj);
    }
    else{
        RefreshStream(buddyObj, q);
    }
}
function RefreshStream(buddyObj, filter) {
    $("#contact-" + buddyObj.identity + "-ChatHistory").empty();

    var json = JSON.parse(localDB.getItem(buddyObj.identity +"-stream"));
    if(json == null || json.DataCollection == null) return;

    // Sort DataCollection (Newest items first)
    json.DataCollection.sort(function(a, b){
        var aMo = moment.utc(a.ItemDate.replace(" UTC", ""));
        var bMo = moment.utc(b.ItemDate.replace(" UTC", ""));
        if (aMo.isSameOrAfter(bMo, "second")) {
            return -1;
        } else return 1;
        return 0;
    });

    // Filter
    if(filter && filter != ""){
        // TODO: Maybe some room for improvement here
        console.log("Rows: ", json.DataCollection.length);
        json.DataCollection = json.DataCollection.filter(function(item){
            if(filter.indexOf("date : ") != -1){
                // Apply Date Filter
                var dateFilter = getFilter(filter, "date");
                if(dateFilter != "" && item.ItemDate.indexOf(dateFilter) != -1) return true;
            }
            if(item.MessageData && item.MessageData.length > 1){
                if(item.MessageData.toLowerCase().indexOf(filter.toLowerCase()) != -1) return true;
                if(filter.toLowerCase().indexOf(item.MessageData.toLowerCase()) != -1) return true;
            }            
            if (item.ItemType == "MSG") {
                // Special search??
            } 
            else if (item.ItemType == "CDR") {
                // Tag Search
                if(item.Tags && item.Tags.length > 1){
                    var tagFilter = getFilter(filter, "tag");
                    if(tagFilter != "") {
                        if(item.Tags.some(function(i){
                            if(tagFilter.toLowerCase().indexOf(i.value.toLowerCase()) != -1) return true;
                            if(i.value.toLowerCase().indexOf(tagFilter.toLowerCase()) != -1) return true;
                            return false;
                        }) == true) return true;
                    }
                }
            }
            else if(item.ItemType == "FILE"){
                // Not yest implemented
            } 
            else if(item.ItemType == "SMS"){
                // Not yest implemented
            }
            // return true to keep;
            return false;
        });
        console.log("Rows After Filter: ", json.DataCollection.length);
    }

    // Create Buffer
    if(json.DataCollection.length > StreamBuffer){
        console.log("Rows:", json.DataCollection.length, " (will be trimed to "+ StreamBuffer +")");
        // Always limit the Stream to {StreamBuffer}, users much search for messages further back
        json.DataCollection.splice(StreamBuffer);
    }

    $.each(json.DataCollection, function (i, item) {

        var IsToday = moment.utc(item.ItemDate.replace(" UTC", "")).isSame(moment.utc(), "day");
        var DateTime = moment.utc(item.ItemDate.replace(" UTC", "")).local().calendar(null, { sameElse: 'YYYY-MM-DD' });
        if(IsToday) DateTime = moment.utc(item.ItemDate.replace(" UTC", "")).local().format("h:mm:ss A");

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

            var deliveryStatus = "<i class=\"fa fa-question-circle-o SendingMessage\"></i>"
            if(item.Sent == true) deliveryStatus = "<i class=\"fa fa-check SentMessage\"></i>";
            if(item.Sent == false) deliveryStatus = "<i class=\"fa fa-exclamation-circle FailedMessage\"></i>";
            if(item.Delivered) deliveryStatus += "<i class=\"fa fa-check DeliveredMessage\"></i>";

            var formattedMessage = ReformatMessage(item.MessageData);
            var longMessage = (formattedMessage.length > 1000);

            if (item.SrcUserId == profileUserID) {
                // You are the source (sending)
                var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr>"
                messageString += "<td class=ourChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">"
                messageString += "<span onclick=\"ShowMessgeMenu(this,'MSG','"+  item.ItemId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
                messageString += "<div id=msg-text-"+ item.ItemId +" class=messageText style=\""+ ((longMessage)? "max-height:190px; overflow:hidden" : "") +"\">" + formattedMessage + "</div>"
                if(longMessage){
                    messageString += "<div id=msg-readmore-"+  item.ItemId +" class=messageReadMore><span onclick=\"ExpandMessage(this,'"+ item.ItemId +"', '"+ buddyObj.identity +"')\">"+ lang.read_more +"</span></div>"
                }
                messageString += "<div class=messageDate>" + DateTime + " " + deliveryStatus +"</div>"
                messageString += "</td>"
                messageString += "</tr></table>";
            } 
            else {
                // You are the destination (receiving)
                var ActualSender = ""; //TODO
                var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr>"
                messageString += "<td class=theirChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">";
                messageString += "<span onclick=\"ShowMessgeMenu(this,'MSG','"+  item.ItemId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
                if(buddyObj.type == "group"){
                    messageString += "<div class=messageDate>" + ActualSender + "</div>";
                }
                messageString += "<div id=msg-text-"+ item.ItemId +" class=messageText style=\""+ ((longMessage)? "max-height:190px; overflow:hidden" : "") +"\">" + formattedMessage + "</div>";
                if(longMessage){
                    messageString += "<div id=msg-readmore-"+  item.ItemId +" class=messageReadMore><span onclick=\"ExpandMessage(this,'"+ item.ItemId +"', '"+ buddyObj.identity +"')\">"+ lang.read_more +"</span></div>"
                }
                messageString += "<div class=messageDate>"+ DateTime + "</div>";
                messageString += "</td>";
                messageString += "</tr></table>";
            }
            $("#contact-" + buddyObj.identity + "-ChatHistory").prepend(messageString);
        } 
        else if (item.ItemType == "CDR") {
            // Add CDR 
            // =======

            // CdrId = uID(),
            // ItemType: "CDR",
            // ItemDate: "...",
            // SrcUserId: srcId,
            // Src: srcCallerID,
            // DstUserId: dstId,
            // Dst: dstCallerID,
            // Billsec: duration.asSeconds(),
            // MessageData: ""
            // ReasonText: 
            // ReasonCode: 
            // Flagged
            // Tags: [""", "", "", ""]
            // Transfers: [{}],
            // Mutes: [{}],
            // Holds: [{}],
            // Recordings: [{ uID, startTime, mediaType, stopTime: utcDateNow, size}],
            // QOS: [{}]
    
            var iconColor = (item.Billsec > 0)? "green" : "red";
            var formattedMessage = "";

            // Flagged
            var flag = "<span id=cdr-flagged-"+  item.CdrId +" style=\""+ ((item.Flagged)? "" : "display:none") +"\">";
            flag += "<i class=\"fa fa-flag FlagCall\"></i> ";
            flag += "</span>";

            // Comment
            var callComment = "";
            if(item.MessageData) callComment = item.MessageData;

            // Tags
            if(!item.Tags) item.Tags = [];
            var CallTags = "<ul id=cdr-tags-"+  item.CdrId +" class=tags style=\""+ ((item.Tags && item.Tags.length > 0)? "" : "display:none" ) +"\">"
            $.each(item.Tags, function (i, tag) {
                CallTags += "<li onclick=\"TagClick(this, '"+ item.CdrId +"', '"+ buddyObj.identity +"')\">"+ tag.value +"</li>";
            });
            CallTags += "<li class=tagText><input maxlength=24 type=text onkeypress=\"TagKeyPress(event, this, '"+ item.CdrId +"', '"+ buddyObj.identity +"')\" onfocus=\"TagFocus(this)\"></li>";
            CallTags += "</ul>";

            // Call Type
            var callIcon = (item.WithVideo)? "fa-video-camera" :  "fa-phone";
            formattedMessage += "<i class=\"fa "+ callIcon +"\" style=\"color:"+ iconColor +"\"></i>";
            var audioVideo = (item.WithVideo)? lang.a_video_call :  lang.an_audio_call;

            // Recordings
            var recordingsHtml = "";
            if(item.Recordings && item.Recordings.length >= 1){
                $.each(item.Recordings, function (i, recording) {
                    if(recording.uID){
                        var StartTime = moment.utc(recording.startTime.replace(" UTC", "")).local();
                        var StopTime = moment.utc(recording.stopTime.replace(" UTC", "")).local();
                        var recordingDuration = moment.duration(StopTime.diff(StartTime));
                        recordingsHtml += "<div class=callRecording>";
                        if(item.WithVideo){
                            if(recording.Poster){
                                var posterWidth = recording.Poster.width;
                                var posterHeight = recording.Poster.height;
                                var posterImage = recording.Poster.posterBase64;
                                recordingsHtml += "<div><IMG src=\""+ posterImage +"\"><button onclick=\"PlayVideoCallRecording(this, '"+ item.CdrId +"', '"+ recording.uID +"')\" class=videoPoster><i class=\"fa fa-play\"></i></button></div>";
                            }
                            else {
                                recordingsHtml += "<div><button onclick=\"PlayVideoCallRecording(this, '"+ item.CdrId +"', '"+ recording.uID +"', '"+ buddyObj.identity +"')\"><i class=\"fa fa-video-camera\"></i></button></div>";
                            }
                        } 
                        else {
                            recordingsHtml += "<div><button onclick=\"PlayAudioCallRecording(this, '"+ item.CdrId +"', '"+ recording.uID +"', '"+ buddyObj.identity +"')\"><i class=\"fa fa-play\"></i></button></div>";
                        } 
                        recordingsHtml += "<div>"+ lang.started +": "+ StartTime.format("h:mm:ss A") +" <i class=\"fa fa-long-arrow-right\"></i> "+ lang.stopped +": "+ StopTime.format("h:mm:ss A") +"</div>";
                        recordingsHtml += "<div>"+ lang.recording_duration +": "+ formatShortDuration(recordingDuration.asSeconds()) +"</div>";
                        recordingsHtml += "<div>";
                        recordingsHtml += "<span id=\"cdr-video-meta-width-"+ item.CdrId +"-"+ recording.uID +"\"></span>";
                        recordingsHtml += "<span id=\"cdr-video-meta-height-"+ item.CdrId +"-"+ recording.uID +"\"></span>";
                        recordingsHtml += "<span id=\"cdr-media-meta-size-"+ item.CdrId +"-"+ recording.uID +"\"></span>";
                        recordingsHtml += "<span id=\"cdr-media-meta-codec-"+ item.CdrId +"-"+ recording.uID +"\"></span>";
                        recordingsHtml += "</div>";
                        recordingsHtml += "</div>";
                    }
                });
            }

            if (item.SrcUserId == profileUserID) {
                // (Outbound) You(profileUserID) initiated a call
                if(item.Billsec == "0") {
                    formattedMessage += " "+ lang.you_tried_to_make +" "+ audioVideo +" ("+ item.ReasonText +").";
                } 
                else {
                    formattedMessage += " "+ lang.you_made + " "+ audioVideo +", "+ lang.and_spoke_for +" " + formatDuration(item.Billsec) + ".";
                }
                var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr>"
                messageString += "<td style=\"padding-right:4px;\">" + flag + "</td>"
                messageString += "<td class=ourChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">";
                messageString += "<span onClick=\"ShowMessgeMenu(this,'CDR','"+  item.CdrId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
                messageString += "<div>" + formattedMessage + "</div>";
                messageString += "<div>" + CallTags + "</div>";
                messageString += "<div id=cdr-comment-"+  item.CdrId +" class=cdrComment>" + callComment + "</div>";
                messageString += "<div class=callRecordings>" + recordingsHtml + "</div>";
                messageString += "<div class=messageDate>" + DateTime  + "</div>";
                messageString += "</td>"
                messageString += "</tr></table>";
            } 
            else {
                // (Inbound) you(profileUserID) received a call
                if(item.Billsec == "0"){
                    formattedMessage += " "+ lang.you_missed_a_call + " ("+ item.ReasonText +").";
                } 
                else {
                    formattedMessage += " "+ lang.you_recieved + " "+ audioVideo +", "+ lang.and_spoke_for +" " + formatDuration(item.Billsec) + ".";
                }
                var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr>";
                messageString += "<td class=theirChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">";
                messageString += "<span onClick=\"ShowMessgeMenu(this,'CDR','"+  item.CdrId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
                messageString += "<div style=\"text-align:left\">" + formattedMessage + "</div>";
                messageString += "<div>" + CallTags + "</div>";
                messageString += "<div id=cdr-comment-"+  item.CdrId +" class=cdrComment>" + callComment + "</div>";
                messageString += "<div class=callRecordings>" + recordingsHtml + "</div>";
                messageString += "<div class=messageDate> " + DateTime + "</div>";
                messageString += "</td>";
                messageString += "<td style=\"padding-left:4px\">" + flag + "</td>";
                messageString += "</tr></table>";
            }
            // Messges are repended here, and appended when logging
            $("#contact-" + buddyObj.identity + "-ChatHistory").prepend(messageString);
        } 
        else if(item.ItemType == "FILE"){
            // TODO
        } 
        else if(item.ItemType == "SMS"){
            // TODO
        }
    });
    updateScroll(buddyObj.identity);
}
function ShowChatMenu(obj){
    $(obj).children("span").show();
}
function HideChatMenu(obj){
    $(obj).children("span").hide();
}
function ExpandMessage(obj, ItemId, buddy){
    $("#msg-text-" + ItemId).css("max-height", "");
    $("#msg-text-" + ItemId).css("overflow", "");
    $("#msg-readmore-" + ItemId).remove();

    HidePopup(500);
}

// Sessions
// ========
function ExpandVideoArea(lineNum){
    $("#line-" + lineNum + "-ActiveCall").prop("class","FullScreenVideo");
    $("#line-" + lineNum + "-VideoCall").css("height", "calc(100% - 100px)");
    $("#line-" + lineNum + "-VideoCall").css("margin-top", "0px");

    $("#line-" + lineNum + "-preview-container").prop("class","PreviewContainer PreviewContainer_FS");
    $("#line-" + lineNum + "-stage-container").prop("class","StageContainer StageContainer_FS");

    $("#line-" + lineNum + "-restore").show();
    $("#line-" + lineNum + "-expand").hide();
}
function RestoreVideoArea(lineNum){
    $("#line-" + lineNum + "-ActiveCall").prop("class","");
    $("#line-" + lineNum + "-VideoCall").css("height", "");
    $("#line-" + lineNum + "-VideoCall").css("margin-top", "10px");

    $("#line-" + lineNum + "-preview-container").prop("class","PreviewContainer");
    $("#line-" + lineNum + "-stage-container").prop("class","StageContainer");

    $("#line-" + lineNum + "-restore").hide();
    $("#line-" + lineNum + "-expand").show();
}
function MuteSession(lineNum){
    $("#line-"+ lineNum +"-btn-Unmute").show();
    $("#line-"+ lineNum +"-btn-Mute").hide();

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track.kind == "audio") {
            if(RTCRtpSender.track.IsMixedTrack == true){
                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                    console.log("Muting Audio Track : "+ session.data.AudioSourceTrack.label);
                    session.data.AudioSourceTrack.enabled = false;
                }
            }
            else {
                console.log("Muting Audio Track : "+ RTCRtpSender.track.label);
                RTCRtpSender.track.enabled = false;
            }
        }
    });

    if(!session.data.mute) session.data.mute = [];
    session.data.mute.push({ event: "mute", eventTime: utcDateNow() });
    session.data.ismute = true;

    $("#line-" + lineNum + "-msg").html(lang.call_on_mute);
}
function UnmuteSession(lineNum){
    $("#line-"+ lineNum +"-btn-Unmute").hide();
    $("#line-"+ lineNum +"-btn-Mute").show();

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track.kind == "audio") {
            if(RTCRtpSender.track.IsMixedTrack == true){
                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                    console.log("Unmuting Audio Track : "+ session.data.AudioSourceTrack.label);
                    session.data.AudioSourceTrack.enabled = true;
                }
            }
            else {
                console.log("Unmuting Audio Track : "+ RTCRtpSender.track.label);
                RTCRtpSender.track.enabled = true;
            }
        }
    });

    if(!session.data.mute) session.data.mute = [];
    session.data.mute.push({ event: "unmute", eventTime: utcDateNow() });
    session.data.ismute = false;

    $("#line-" + lineNum + "-msg").html(lang.call_off_mute);
}
function ShowDtmfMenu(obj, lineNum){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
    dhtmlxPopup = new dhtmlXPopup();
    var html = "<table>";
    html += "<tr><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '1')\">1</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '2')\">2</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '3')\">3</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '4')\">4</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '5')\">5</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '6')\">6</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '7')\">7</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '8')\">8</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '9')\">9</button></td></tr>";
    html += "<tr><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '*')\">*</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '0')\">0</button></td><td><button class=dtmfButtons onclick=\"sendDTMF('"+ lineNum +"', '#')\">#</button></td></tr>";
    html += "</table>";
    dhtmlxPopup.attachHTML(html);
    dhtmlxPopup.show(x, y, w, h);
}

// Stream Functionality
// =====================
function ShowMessgeMenu(obj, typeStr, cdrId, buddy) {
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
    dhtmlxPopup = new dhtmlXPopup();

    var menu = null;
    // CDR's Menu
    if (typeStr == "CDR") {
        var TagState = $("#cdr-flagged-"+ cdrId).is(":visible");
        var TagText = (TagState)? lang.clear_flag : lang.flag_call;
        menu = [
            // { id: 1, name: "<i class=\"fa fa-external-link\"></i> Show Call Detail Record" },
            { id: 2, name: "<i class=\"fa fa-tags\"></i> "+ lang.tag_call },
            { id: 3, name: "<i class=\"fa fa-flag\"></i> "+ TagText },
            { id: 4, name: "<i class=\"fa fa-quote-left\"></i> "+ lang.edit_comment },
        ];
        // menu.push({ id: 20, name: "Delete CDR" });
        // menu.push({ id: 21, name: "Remove Poster Images" });
    }
    if (typeStr == "MSG") {
        menu = [
            { id: 10, name: "<i class=\"fa fa-clipboard\"></i> "+ lang.copy_message },
            // { id: 11, name: "<i class=\"fa fa-pencil\"></i> Edit Message" },
            { id: 12, name: "<i class=\"fa fa-quote-left\"></i> "+ lang.quote_message },
        ];
    }

    dhtmlxPopup.attachList("name", menu);
    dhtmlxPopup.attachEvent("onClick", function(id){
        HidePopup();

        if(id == 1){
            // Open CDR Details Window
        }
        if(id == 2){
            $("#cdr-tags-"+ cdrId).show();
        }
        if(id == 3){
            // Tag / Untag Call
            var TagState = $("#cdr-flagged-"+ cdrId).is(":visible");
            if(TagState){
                console.log("Clearing Flag from: ", cdrId);
                $("#cdr-flagged-"+ cdrId).hide();

                // Update DB
                var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                if(currentStream != null || currentStream.DataCollection != null){
                    $.each(currentStream.DataCollection, function (i, item) {
                        if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                            // Found
                            item.Flagged = false;
                            return false;
                        }
                    });
                    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                }
            }
            else {
                console.log("Flag Call: ", cdrId);
                $("#cdr-flagged-"+ cdrId).show();

                // Update DB
                var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                if(currentStream != null || currentStream.DataCollection != null){
                    $.each(currentStream.DataCollection, function (i, item) {
                        if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                            // Found
                            item.Flagged = true;
                            return false;
                        }
                    });
                    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                }
            }
        }
        if(id == 4){
            var currentText = $("#cdr-comment-"+ cdrId).text();
            $("#cdr-comment-"+ cdrId).empty();

            var textboxObj = $("<input maxlength=500 type=text>").appendTo("#cdr-comment-"+ cdrId);
            textboxObj.on("focus", function(){
                HidePopup(500);
            });
            textboxObj.on("blur", function(){
                var newText = $(this).val();
                SaveComment(cdrId, buddy, newText);
            });
            textboxObj.keypress(function(event){
                window.setTimeout(function(){
                    if(dhtmlxPopup != null)
                    {
                        dhtmlxPopup.hide();
                        dhtmlxPopup.unload();
                        dhtmlxPopup = null;
                    }
                }, 500);

                var keycode = (event.keyCode ? event.keyCode : event.which);
                if (keycode == '13') {
                    event.preventDefault();

                    var newText = $(this).val();
                    SaveComment(cdrId, buddy, newText);
                }
            });
            textboxObj.val(currentText);
            textboxObj.focus();
        }

        // Text Messages
        if(id == 10){
            var msgtext = $("#msg-text-"+ cdrId).text();
            navigator.clipboard.writeText(msgtext).then(function(){
                console.log("Text coppied to the clipboard:", msgtext);
            }).catch(function(){
                console.error("Error writing to the clipboard:", e);
            });
        }
        if(id == 11){
            // TODO... 
            // Involves sharing a message ID, then on change, sent update request
            // So that both parties share the same update.
        }
        if(id == 12){
            var msgtext = $("#msg-text-"+ cdrId).text();
            msgtext = "\""+ msgtext + "\"";
            var textarea = $("#contact-"+ buddy +"-ChatMessage");
            console.log("Quote Message:", msgtext);
            textarea.val(msgtext +"\n" + textarea.val());
            RefreshChatPreview(null, textarea.val(), buddy);
        }

        // Delete CDR
        if(id == 20){
            var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
            if(currentStream != null || currentStream.DataCollection != null){
                $.each(currentStream.DataCollection, function (i, item) {
                    if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                        // Found
                        currentStream.DataCollection.splice(i, 1);
                        return false;
                    }
                });
                localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                RefreshStream(FindBuddyByIdentity(buddy));
            }
        }
        // Delete Poster Image
        if(id == 21){
            var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
            if(currentStream != null || currentStream.DataCollection != null){
                $.each(currentStream.DataCollection, function (i, item) {
                    if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                        // Found
                        if(item.Recordings && item.Recordings.length >= 1){
                            $.each(item.Recordings, function(r, recording) {
                                recording.Poster = null;
                            });
                        }
                        console.log("Poster Imagers Deleted");
                        return false;
                    }
                });
                localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                RefreshStream(FindBuddyByIdentity(buddy));
            }
        }
    });
    dhtmlxPopup.show(x, y, w, h);
}
function SaveComment(cdrId, buddy, newText){
    console.log("Setting Comment:", newText);

    $("#cdr-comment-"+ cdrId).empty();
    $("#cdr-comment-"+ cdrId).append(newText);

    // Update DB
    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                // Found
                item.MessageData = newText;
                return false;
            }
        });
        localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
    }
}
function TagKeyPress(event, obj, cdrId, buddy){
    HidePopup(500);

    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13' || keycode == '44') {
        event.preventDefault();

        if ($(obj).val() == "") return;

        console.log("Adding Tag:", $(obj).val());

        $("#cdr-tags-"+ cdrId+" li:last").before("<li onclick=\"TagClick(this, '"+ cdrId +"', '"+ buddy +"')\">"+ $(obj).val() +"</li>");
        $(obj).val("");

        // Update DB
        UpdateTags(cdrId, buddy);
    }
}
function TagClick(obj, cdrId, buddy){
    window.setTimeout(function(){
        if(dhtmlxPopup != null)
        {
            dhtmlxPopup.hide();
            dhtmlxPopup.unload();
            dhtmlxPopup = null;
        }
    }, 500);

    console.log("Removing Tag:", $(obj).text());
    $(obj).remove();

    // Dpdate DB
    UpdateTags(cdrId, buddy);
}
function UpdateTags(cdrId, buddy){
    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                // Found
                item.Tags = [];
                $("#cdr-tags-"+ cdrId).children('li').each(function () {
                    if($(this).prop("class") != "tagText") item.Tags.push({ value: $(this).text() });
                });
                return false;
            }
        });
        localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
    }
}

function TagFocus(obj){
    HidePopup(500);
}
function AddMenu(obj, buddy){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
    dhtmlxPopup = new dhtmlXPopup();

    var menu = [
        { id: 1, name: "<i class=\"fa fa-smile-o\"></i> " + lang.select_expression },
        { id: 2, name: "<i class=\"fa fa-microphone\"></i> " + lang.dictate_message  }
    ];
    if(enabledExtendedServices){
        menu.push({ id: 3, name: "<i class=\"fa fa-share-alt\"></i> Share File" });
        menu.push({ id: 4, name: "<i class=\"fa fa-camera\"></i> Take Picture" });
        menu.push({ id: 5, name: "<i class=\"fa fa-file-audio-o\"></i> Record Audio Message" });
        menu.push({ id: 6, name: "<i class=\"fa fa-file-video-o\"></i> Record Video Message" });
    }

    dhtmlxPopup.attachList("name", menu);
    dhtmlxPopup.attachEvent("onClick", function(id){
        dhtmlxPopup.hide();
        dhtmlxPopup.unload();
        dhtmlxPopup = null;

        // Emoji Bar
        if(id == "1"){
            ShowEmojiBar(buddy);
        }
        // Disctate Message
        if(id == "2"){
            ShowDictate(buddy);
        }
        // 


    });
    dhtmlxPopup.show(x, y, w, h);
}
function ShowEmojiBar(buddy){
    var messageContainer = $("#contact-"+ buddy +"-emoji-menu");
    var textarea = $("#contact-"+ buddy +"-ChatMessage");

    var menuBar = $("<div>");
    menuBar.prop("class", "emojiButton")
    var emojis = ["😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🙁","🙂","🙃","🙄","🤐","🤑","🤒","🤓","🤔","🤕","🤠","🤡","🤢","🤣","🤤","🤥","🤧","🤨","🤩","🤪","🤫","🤬","🤭","🤮","🤯","🧐"];
    $.each(emojis, function(i,e){
        var emoji = $("<button>");
        emoji.html(e);
        emoji.on('click', function(){
            var i = textarea.prop('selectionStart');
            var v = textarea.val();
            textarea.val(v.substring(0, i) + $(this).html() + v.substring(i, v.length));
            RefreshChatPreview(null, textarea.val(), buddy);
            messageContainer.hide();
        });
        menuBar.append(emoji);
    });

    messageContainer.empty();
    messageContainer.append(menuBar);
    messageContainer.show();
}
function ShowDictate(buddy){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null){
        return;
    }

    if(buddyObj.recognition != null){
        buddyObj.recognition.abort();
        buddyObj.recognition = null;
    }
    try {
        // Limitation: This opbject can only be made once on the page
        // Generally this is fine, as you can only really dictate one message at a time.
        // It will use the most recently created object.
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        buddyObj.recognition = new SpeechRecognition();
    }
    catch(e) {
        console.error(e);
        Alert(lang.alert_speech_recognition, lang.speech_recognition);
        return;
    }

    var instructions = $("<div>");
    var messageContainer = $("#contact-"+ buddy +"-dictate-message");
    var textarea = $("#contact-"+ buddy +"-ChatMessage");

    buddyObj.recognition.continuous = true;
    buddyObj.recognition.onstart = function() { 
        instructions.html("<i class=\"fa fa-microphone\" style=\"font-size: 21px\"></i><i class=\"fa fa-cog fa-spin\" style=\"font-size:10px; vertical-align:text-bottom; margin-left:2px\"></i> "+ lang.im_listening);
    }
    buddyObj.recognition.onspeechend = function() {
        instructions.html(lang.msg_silence_detection);
        window.setTimeout(function(){
            messageContainer.hide();
        }, 1000);
    }
    buddyObj.recognition.onerror = function(event) {
        if(event.error == 'no-speech') {
            instructions.html(lang.msg_no_speech);
        }
        else {
            if(buddyObj.recognition){
                console.warn("SpeechRecognition Error: ", event);
                buddyObj.recognition.abort();
            }
            buddyObj.recognition = null;
        }
        window.setTimeout(function(){
            messageContainer.hide();
        }, 1000);
    }
    buddyObj.recognition.onresult = function(event) {
        var transcript = event.results[event.resultIndex][0].transcript;
        if((event.resultIndex == 1 && transcript == event.results[0][0].transcript) == false) {
            if($.trim(textarea.val()).endsWith(".") || $.trim(textarea.val()) == "") {
                if(transcript == "\r" || transcript == "\n" || transcript == "\r\n" || transcript == "\t"){
                    // WHITESPACE ONLY
                }
                else {
                    transcript = $.trim(transcript);
                    transcript = transcript.replace(/^./, " "+ transcript[0].toUpperCase());
                }
            }
            console.log("Dictate:", transcript);
            textarea.val(textarea.val() + transcript);
            RefreshChatPreview(null, textarea.val(), buddy);
        }
    }

    messageContainer.empty();
    messageContainer.append(instructions);
    messageContainer.show();

    buddyObj.recognition.start();
}


// My Profile
// ==========
function ShowMyProfileMenu(obj){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
    dhtmlxPopup = new dhtmlXPopup();
    var menu = [
        {id: 2, name: "<i class=\"fa fa-refresh\"></i> "+ lang.refresh_registration , enabled: ""},
        {id: 3, name: "<i class=\"fa fa-wrench\"></i> "+ lang.configure_extension, enabled: ""},
        // Register Automatically, Ring Tone, Ring Device, Volume, Onscreen Notification, CRM Hooks
        dhtmlxPopup.separator,
        {id: 4, name: "<i class=\"fa fa-user-plus\"></i> "+ lang.add_someone, enabled: ""},
        {id: 5, name: "<i class=\"fa fa-users\"></i><i class=\"fa fa-plus\" style=\"font-size:9px\"></i> "+ lang.create_group, enabled: ""},
        dhtmlxPopup.separator,
        {id: 6, name: "<i class=\"fa fa-phone\"></i> "+ lang.auto_answer , enabled: AutoAnswerEnabled? "<i class=\"fa fa-check\"></i>" : "" },
        {id: 7, name: "<i class=\"fa fa-ban\"></i> "+ lang.do_no_disturb, enabled: DoNotDisturbEnabled? "<i class=\"fa fa-check\"></i>" : "" },
        {id: 8, name: "<i class=\"fa fa-volume-control-phone\"></i> "+ lang.call_waiting, enabled: CallWaitingEnabled? "<i class=\"fa fa-check\"></i>" : ""},
        {id: 9, name: "<i class=\"fa fa-dot-circle-o\"></i> "+ lang.record_all_calls, enabled: RecordAllCalls? "<i class=\"fa fa-check\"></i>" : "" },
    ];
    if(enabledGroupServices == false) menu.splice(4, 1);
    dhtmlxPopup.attachList("name,enabled", menu);
    dhtmlxPopup.attachEvent("onClick", function(id){
        HidePopup();

        if(id == 2) RefreshRegistration();
        if(id == 3) ConfigureExtensionWindow();
        // ---
        if(id == 4) AddSomeoneWindow();
        if(id == 5) CreateGroupWindow();
        // ----
        if(id == 6) ToggleAutoAnswer();
        if(id == 7) ToggleDoNoDisturb();
        if(id == 8) ToggleCallWaiting();
        if(id == 9) ToggleRecordAllCalls();

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
    if(AutoAnswerPolicy == "disabled"){
        AutoAnswerEnabled = false;
        console.warn("Policy AutoAnswer: Disabled");
        return;
    }
    AutoAnswerEnabled = (AutoAnswerEnabled == true)? false : true;
    if(AutoAnswerPolicy == "enabled") AutoAnswerEnabled = true;
    localDB.setItem("AutoAnswerEnabled", (AutoAnswerEnabled == true)? "1" : "0");
    console.log("AutoAnswer:", AutoAnswerEnabled);
}
function ToggleDoNoDisturb(){
    if(DoNotDisturbPolicy == "disabled"){
        DoNotDisturbEnabled = false;
        console.warn("Policy DoNotDisturb: Disabled");
        return;
    }
    DoNotDisturbEnabled = (DoNotDisturbEnabled == true)? false : true;
    if(DoNotDisturbPolicy == "enabled") DoNotDisturbEnabled = true;
    localDB.setItem("DoNotDisturbEnabled", (DoNotDisturbEnabled == true)? "1" : "0");
    console.log("DoNotDisturb", DoNotDisturbEnabled);
}
function ToggleCallWaiting(){
    if(CallWaitingPolicy == "disabled"){
        CallWaitingEnabled = false;
        console.warn("Policy CallWaiting: Disabled");
        return;
    }
    CallWaitingEnabled = (CallWaitingEnabled == true)? false : true;
    if(CallWaitingPolicy == "enabled") CallWaitingPolicy = true;
    localDB.setItem("CallWaitingEnabled", (CallWaitingEnabled == true)? "1" : "0");
    console.log("CallWaiting", CallWaitingEnabled);
}
function ToggleRecordAllCalls(){
    if(CallRecordingPolicy == "disabled"){
        RecordAllCalls = false;
        console.warn("Policy CallRecording: Disabled");
        return;
    }
    RecordAllCalls = (RecordAllCalls == true)? false : true;
    if(CallRecordingPolicy == "enabled") RecordAllCalls = true;
    localDB.setItem("RecordAllCalls", (RecordAllCalls == true)? "1" : "0");
    console.log("RecordAllCalls", RecordAllCalls);
}

function ShowBuddyProfileMenu(buddy, obj, typeStr){
    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();
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

        $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.extension_number +":</div>");
        $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ExtNo +" </div>");

        if(buddyObj.Email && buddyObj.Email != "null" && buddyObj.Email != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.email +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Email +" </div>");
        }
        if(buddyObj.MobileNumber && buddyObj.MobileNumber != "null" && buddyObj.MobileNumber != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.mobile +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.MobileNumber +" </div>");
        }
        if(buddyObj.ContactNumber1 && buddyObj.ContactNumber1 != "null" && buddyObj.ContactNumber1 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.alternative_contact +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber1 +" </div>");
        }
        if(buddyObj.ContactNumber2 && buddyObj.ContactNumber2 != "null" && buddyObj.ContactNumber2 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.alternative_contact +":</div>");
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

        if(buddyObj.Email && buddyObj.Email != "null" && buddyObj.Email != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.email +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.Email +" </div>");
        }
        if(buddyObj.MobileNumber && buddyObj.MobileNumber != "null" && buddyObj.MobileNumber != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.mobile +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.MobileNumber +" </div>");
        }
        if(buddyObj.ContactNumber1 && buddyObj.ContactNumber1 != "null" && buddyObj.ContactNumber1 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.alternative_contact +":</div>");
            $("#ProfileInfo").append("<div class=ProfileTextMedium>"+ buddyObj.ContactNumber1 +" </div>");
        }
        if(buddyObj.ContactNumber2 && buddyObj.ContactNumber2 != "null" && buddyObj.ContactNumber2 != "undefined"){
            $("#ProfileInfo").append("<div class=ProfileTextSmall style=\"margin-top:15px\">"+ lang.alternative_contact +":</div>");
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
function ChangeSettings(lineNum, obj){

    var x = window.dhx4.absLeft(obj);
    var y = window.dhx4.absTop(obj);
    var w = obj.offsetWidth;
    var h = obj.offsetHeight;

    HidePopup();

    // Check if you are in a call
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;
    var session = lineObj.SipSession;

    dhtmlxPopup = new dhtmlXPopup();
    dhtmlxPopup.attachHTML("<div id=DeviceSelector style=\"width:250px\">"+ lang.loading +"</DIV>");
    dhtmlxPopup.show(x, y, w, h);

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

    // Handle Audio Source changes (Microphone)
    audioSelect.change(function(){
        console.log("Call to change Microphone: ", this.value);

        HidePopup();

        // First Stop Recording the call
        var mustRestartRecording = false;
        if(session.data.mediaRecorder && session.data.mediaRecorder.state == "recording"){
            StopRecording(lineNum, true);
            mustRestartRecording = true;
        }

        // Stop Monitoring
        if(lineObj.LocalSoundMeter) lineObj.LocalSoundMeter.stop();

        // Save Setting
        session.data.AudioSourceDevice = this.value;

        var constraints = {
            audio: {
                deviceId: (this.value != "default")? { exact: this.value } : "default"
            },
            video: false
        }
        navigator.mediaDevices.getUserMedia(constraints).then(function(newStream){
            // Assume that since we are selecting from a dropdown, this is possible
            var newMediaTrack = newStream.getAudioTracks()[0];
            var pc = session.sessionDescriptionHandler.peerConnection;
            pc.getSenders().forEach(function (RTCRtpSender) {
                if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                    console.log("Switching Audio Track : "+ RTCRtpSender.track.label + " to "+ newMediaTrack.label);
                    RTCRtpSender.track.stop(); // Must stop, or this mic will stay in use
                    RTCRtpSender.replaceTrack(newMediaTrack).then(function(){
                        // Start Recording again
                        if(mustRestartRecording) StartRecording(lineNum);
                        // Monitor Adio Stream
                        lineObj.LocalSoundMeter = StartLocalAudioMediaMonitoring(lineNum, session);
                    }).catch(function(e){
                        console.error("Error replacing track: ", e);
                    });
                }
            });
        }).catch(function(e){
            console.error("Error on getUserMedia");
        });
    });

    // Handle output change (speaker)
    speakerSelect.change(function(){
        console.log("Call to change Speaker: ", this.value);

        HidePopup();

        // Save Setting
        session.data.AudioOutputDevice = this.value;

        // Also change the sinkId
        // ======================
        var sinkId = this.value;
        console.log("Attempting to set Audio Output SinkID for line "+ lineNum +" [" + sinkId + "]");

        // Remote Audio
        var element = $("#line-"+ lineNum +"-remoteAudio").get(0);
        if(element) {
            if (typeof element.sinkId !== 'undefined') {
                element.setSinkId(sinkId).then(function(){
                    console.log("sinkId applied: "+ sinkId);
                }).catch(function(e){
                    console.warn("Error using setSinkId: ", e);
                });
            } else {
                console.warn("setSinkId() is not possible using this browser.")
            }
        }
    });

    // Handle video input change (WebCam)
    videoSelect.change(function(){
        console.log("Call to change WebCam");

        HidePopup();

        switchVideoSource(lineNum, this.value);
    });

    // Load Devices
    if(!navigator.mediaDevices) {
        console.warn("navigator.mediaDevices not possible.");
        return;
    }

    for (var i = 0; i < AudioinputDevices.length; ++i) {
        var deviceInfo = AudioinputDevices[i];
        var devideId = deviceInfo.deviceId;
        var DisplayName = (deviceInfo.label)? deviceInfo.label : "";
        if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));

        // Create Option
        var option = $('<option/>');
        option.prop("value", devideId);
        option.text((DisplayName != "")? DisplayName : "Microphone");
        if(session.data.AudioSourceDevice == devideId) option.prop("selected", true);
        audioSelect.append(option);
    }
    for (var i = 0; i < VideoinputDevices.length; ++i) {
        var deviceInfo = VideoinputDevices[i];
        var devideId = deviceInfo.deviceId;
        var DisplayName = (deviceInfo.label)? deviceInfo.label : "";
        if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));

        // Create Option
        var option = $('<option/>');
        option.prop("value", devideId);
        option.text((DisplayName != "")? DisplayName : "Webcam");
        if(session.data.VideoSourceDevice == devideId) option.prop("selected", true);
        videoSelect.append(option);
    }
    if(HasSpeakerDevice){
        for (var i = 0; i < SpeakerDevices.length; ++i) {
            var deviceInfo = SpeakerDevices[i];
            var devideId = deviceInfo.deviceId;
            var DisplayName = (deviceInfo.label)? deviceInfo.label : "";
            if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));

            // Create Option
            var option = $('<option/>');
            option.prop("value", devideId);
            option.text((DisplayName != "")? DisplayName : "Speaker"); 
            if(session.data.AudioOutputDevice == devideId) option.prop("selected", true);
            speakerSelect.append(option);
        }
    }
    // Show Popup
    // ==========
    dhtmlxPopup.attachHTML("<div id=DeviceSelector style=\"width:250px\"></DIV>");

    // Mic Serttings
    $("#DeviceSelector").append("<div style=\"margin-top:20px\">"+ lang.microphone +": </div>");
    $("#DeviceSelector").append(audioSelect);
    
    // Speaker
    if(HasSpeakerDevice){
        $("#DeviceSelector").append("<div style=\"margin-top:20px\">"+ lang.speaker +": </div>");
        $("#DeviceSelector").append(speakerSelect);
    }
    // Camera
    $("#DeviceSelector").append("<div style=\"margin-top:20px\">"+ lang.camera +": </div>");
    $("#DeviceSelector").append(videoSelect);

    // Show Menu
    dhtmlxPopup.show(x, y, w, h);
}

// Media Presentation
// ==================
function PresentCamera(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null.");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-src-camera").prop("disabled", true);
    $("#line-"+ lineNum +"-src-canvas").prop("disabled", false);
    $("#line-"+ lineNum +"-src-desktop").prop("disabled", false);
    $("#line-"+ lineNum +"-src-video").prop("disabled", false);
    $("#line-"+ lineNum +"-src-blank").prop("disabled", false);

    $("#line-"+ lineNum + "-scratchpad-container").hide();
    RemoveScratchpad(lineNum);
    $("#line-"+ lineNum +"-sharevideo").hide();
    $("#line-"+ lineNum +"-sharevideo").get(0).pause();
    $("#line-"+ lineNum +"-sharevideo").get(0).removeAttribute('src');
    $("#line-"+ lineNum +"-sharevideo").get(0).load();
    window.clearInterval(session.data.videoResampleInterval);

    $("#line-"+ lineNum + "-localVideo").show();
    $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

    switchVideoSource(lineNum, session.data.VideoSourceDevice);
}
function PresentScreen(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null.");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-src-camera").prop("disabled", false);
    $("#line-"+ lineNum +"-src-canvas").prop("disabled", false);
    $("#line-"+ lineNum +"-src-desktop").prop("disabled", true);
    $("#line-"+ lineNum +"-src-video").prop("disabled", false);
    $("#line-"+ lineNum +"-src-blank").prop("disabled", false);

    $("#line-"+ lineNum + "-scratchpad-container").hide();
    RemoveScratchpad(lineNum);
    $("#line-"+ lineNum +"-sharevideo").hide();
    $("#line-"+ lineNum +"-sharevideo").get(0).pause();
    $("#line-"+ lineNum +"-sharevideo").get(0).removeAttribute('src');
    $("#line-"+ lineNum +"-sharevideo").get(0).load();
    window.clearInterval(session.data.videoResampleInterval);

    $("#line-"+ lineNum + "-localVideo").hide();
    $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

    ShareScreen(lineNum);
}
function PresentScratchpad(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null.");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-src-camera").prop("disabled", false);
    $("#line-"+ lineNum +"-src-canvas").prop("disabled", true);
    $("#line-"+ lineNum +"-src-desktop").prop("disabled", false);
    $("#line-"+ lineNum +"-src-video").prop("disabled", false);
    $("#line-"+ lineNum +"-src-blank").prop("disabled", false);

    $("#line-"+ lineNum + "-scratchpad-container").hide();
    RemoveScratchpad(lineNum);
    $("#line-"+ lineNum +"-sharevideo").hide();
    $("#line-"+ lineNum +"-sharevideo").get(0).pause();
    $("#line-"+ lineNum +"-sharevideo").get(0).removeAttribute('src');
    $("#line-"+ lineNum +"-sharevideo").get(0).load();
    window.clearInterval(session.data.videoResampleInterval);

    $("#line-"+ lineNum + "-localVideo").hide();
    $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-preview-container");

    SendCanvas(lineNum);
}
function PresentVideo(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null.");
        return;
    }
    var session = lineObj.SipSession;

    var html = "<div class=\"UiWindowField\"><input type=file  accept=\"video/*\" id=SelectVideoToSend></div>";
    OpenWindow(html, lang.select_video, 150, 360, false, false, null, null, lang.cancel, function(){
        // Cancel
        CloseWindow();
    }, function(){
        // Do OnLoad
        $("#SelectVideoToSend").on('change', function(event){
            var input = event.target;
            if(input.files.length >= 1){
                CloseWindow();

                // Send Video (Can only send one file)
                SendVideo(lineNum, URL.createObjectURL(input.files[0]));
            }
            else {
                console.warn("Please Select a file to present.");
            }
        });
    }, null);
}
function PresentBlank(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null.");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-src-camera").prop("disabled", false);
    $("#line-"+ lineNum +"-src-canvas").prop("disabled", false);
    $("#line-"+ lineNum +"-src-desktop").prop("disabled", false);
    $("#line-"+ lineNum +"-src-video").prop("disabled", false);
    $("#line-"+ lineNum +"-src-blank").prop("disabled", true);
    
    $("#line-"+ lineNum + "-scratchpad-container").hide();
    RemoveScratchpad(lineNum);
    $("#line-"+ lineNum +"-sharevideo").hide();
    $("#line-"+ lineNum +"-sharevideo").get(0).pause();
    $("#line-"+ lineNum +"-sharevideo").get(0).removeAttribute('src');
    $("#line-"+ lineNum +"-sharevideo").get(0).load();
    window.clearInterval(session.data.videoResampleInterval);

    $("#line-"+ lineNum + "-localVideo").hide();
    $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

    DisableVideoStream(lineNum);
}
function RemoveScratchpad(lineNum){
    var scratchpad = GetCanvas("line-" + lineNum + "-scratchpad");
    if(scratchpad != null){
        window.clearInterval(scratchpad.redrawIntrtval);

        RemoveCanvas("line-" + lineNum + "-scratchpad");
        $("#line-"+ lineNum + "-scratchpad-container").empty();

        scratchpad = null;
    }
}

// Call Statistics
// ===============
function ShowCallStats(lineNum, obj){
    console.log("Show Call Stats");
    $("#line-"+ lineNum +"-AdioStats").show(300);
}
function HideCallStats(lineNum, obj){
    console.log("Hide Call Stats");
    $("#line-"+ lineNum +"-AdioStats").hide(300);
}

// Chatting
// ========
function chatOnbeforepaste(event, obj, buddy){
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
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13'){
        if(event.shiftKey || event.ctrlKey) {
            // Leave as is
            // Windows and Mac react differently here.
        } else {
            event.preventDefault();
            
            SendChatMessage(buddy);
            return false;
        }
    } 

    // handle paste, etc
    RefreshChatPreview(event, $.trim($(obj).val()), buddy);
}
function chatOnInput(event, obj, buddy) {
    console.log(event);
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

    updateScroll(buddy);
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
    }
    else {
        dbImg = localDB.getItem("img-"+ buddyId +"-"+ typestr);
    }
    if(dbImg == null || dbImg == "null" || dbImg == "") return hostingPrefex + "default.png";

    // return URL.createObjectURL(base64toBlob(dbImg, 'image/png'));

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
            if(CanvasCollection[c].id == canvasId) {
                console.log("Found Old Canvas, Disposing...");

                CanvasCollection[c].clear()
                CanvasCollection[c].dispose();

                CanvasCollection[c].id = "--deleted--";

                console.log("CanvasCollection.splice("+ c +", 1)");
                CanvasCollection.splice(c, 1);
                break;
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
var ImageEditor_Send = function (buddy){
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
    if($("#contact-" + buddy + "-search").is(":visible") == false){
        RefreshStream(FindBuddyByIdentity(buddy));
    } 
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
function preventDefault(e){
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
    html += "<div class=UiButtonBar><button id=AlertOkButton style=\"width:80px\">"+ lang.ok +"</button></div>";
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
    html += "<div class=UiButtonBar><button id=ConfirmOkButton style=\"width:80px\">"+ lang.ok +"</button><button id=ConfrimCancelButton style=\"width:80px\">"+ lang.cancel +"</button></div>";
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
    html += "<div class=UiButtonBar><button id=PromptOkButton style=\"width:80px\">"+ lang.ok +"</button>&nbsp;<button id=PromptCancelButton class=UiButton style=\"width:80px\">"+ lang.cancel +"</button></div>";
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
function HidePopup(timeout){
    if(timeout){
        window.setTimeout(function(){
            if(dhtmlxPopup != null){
                dhtmlxPopup.hide();
                dhtmlxPopup.unload();
                dhtmlxPopup = null;
            }
        }, timeout);
    } else {
        if(dhtmlxPopup != null){
            dhtmlxPopup.hide();
            dhtmlxPopup.unload();
            dhtmlxPopup = null;
        }
    }
}

// Device Detection
// ================
function DetectDevices(){
    navigator.mediaDevices.enumerateDevices().then(function(deviceInfos){
        // deviceInfos will not have a populated lable unless to accept the permission
        // during getUserMedia. This normally happens at startup/setup
        // so from then on these devices will be with lables.
        HasVideoDevice = false;
        HasAudioDevice = false;
        HasSpeakerDevice = false; // Safari and Firefox don't have these
        AudioinputDevices = [];
        VideoinputDevices = [];
        SpeakerDevices = [];
        for (var i = 0; i < deviceInfos.length; ++i) {
            if (deviceInfos[i].kind === "audioinput") {
                HasAudioDevice = true;
                AudioinputDevices.push(deviceInfos[i]);
            } 
            else if (deviceInfos[i].kind === "audiooutput") {
                HasSpeakerDevice = true;
                SpeakerDevices.push(deviceInfos[i]);
            }
            else if (deviceInfos[i].kind === "videoinput") {
                HasVideoDevice = true;
                VideoinputDevices.push(deviceInfos[i]);
            }
        }
        // console.log(AudioinputDevices, VideoinputDevices);
    }).catch(function(e){
        console.error("Error enumerating devices", e);
    });
}
DetectDevices();
window.setInterval(function(){
    DetectDevices();
}, 10000);

// STATUS_NULL: 0
// STATUS_INVITE_SENT: 1
// STATUS_1XX_RECEIVED: 2
// STATUS_INVITE_RECEIVED: 3
// STATUS_WAITING_FOR_ANSWER: 4
// STATUS_ANSWERED: 5
// STATUS_WAITING_FOR_PRACK: 6
// STATUS_WAITING_FOR_ACK: 7
// STATUS_CANCELED: 8
// STATUS_TERMINATED: 9
// STATUS_ANSWERED_WAITING_FOR_PRACK: 10
// STATUS_EARLY_MEDIA: 11
// STATUS_CONFIRMED: 12

// =================================================================================
// End Of File