/**
* ====================
*  ☎️ Browser Phone ☎️ 
* ====================
* A fully featured browser based WebRTC SIP phone for Asterisk
* -------------------------------------------------------------
*  Copyright (c) 2020  - Conrad de Wet - All Rights Reserved.
* =============================================================
* File: phone.js
* License: GNU Affero General Public License v3.0
* Owner: Conrad de Wet
* Date: April 2020
* Git: https://github.com/InnovateAsterisk/Browser-Phone
*/

// Global Settings
// ===============
const appversion = "0.3.28";
const sipjsversion = "0.20.0";
const navUserAgent = window.navigator.userAgent;  // TODO: change to Navigator.userAgentData
const instanceID = String(Date.now());
const localDB = window.localStorage;

// Set the following to null to disable
let welcomeScreen = "<div class=\"UiWindowField\"><pre style=\"font-size: 12px\">";
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

/**
 * Language Packs (lang/xx.json)
 * Note: The following should correspond to files on your server. 
 * eg: If you list "fr" then you need to add the file "fr.json".
 * Use the "en.json" as a template.
 * More specific language must be first. ie: "zh-hans" should be before "zh".
 * "en.json" is always loaded by default
 */
let loadAlternateLang = (getDbItem("loadAlternateLang", "0") == "1"); // Enables searching and loading for the additional language packs other thAan /en.json
const availableLang = ["fr", "ja", "zh-hans", "zh", "ru", "tr", "nl", "es", "de", "pl", "pt-br"]; // Defines the language packs (.json) available in /lang/ folder

/**
 * Image Assets
 * Note: You can specify the assets to use below in array format
 */
let imagesDirectory = getDbItem("imagesDirectory", "");     // Directory For Image Assets eg: images/ 
let defaultAvatars = getDbItem("defaultAvatars", "avatars/default.0.webp,avatars/default.1.webp,avatars/default.2.webp,avatars/default.3.webp,avatars/default.4.webp,avatars/default.5.webp,avatars/default.6.webp,avatars/default.7.webp,avatars/default.8.webp"); 
let wallpaperLight = getDbItem("wallpaperLight", "wallpaper.light.webp");  // Wallpaper for Light Theme
let wallpaperDark = getDbItem("wallpaperDark", "wallpaper.dark.webp");     // Wallpaper for Dark Theme

/**
 * 
 * User Settings & Defaults
 * Note: Generally you don't really need to be changing these settings, the defaults should be fine
 * If you want to  keep this library in its original form, but still provision settings, look at the
 * index.html for some sample provisioning and web_hook options.
 */
let profileUserID = getDbItem("profileUserID", null);   // Internal reference ID. (DON'T CHANGE THIS!)
let profileName = getDbItem("profileName", null);       // eg: Keyla James
let wssServer = getDbItem("wssServer", null);           // eg: raspberrypi.local
let WebSocketPort = getDbItem("WebSocketPort", null);   // eg: 444 | 4443
let ServerPath = getDbItem("ServerPath", null);         // eg: /ws
let SipDomain = getDbItem("SipDomain", null);           // eg: raspberrypi.local
let SipUsername = getDbItem("SipUsername", null);       // eg: webrtc
let SipPassword = getDbItem("SipPassword", null);       // eg: webrtc

let SingleInstance = (getDbItem("SingleInstance", "1") == "1");      // Un-registers this account if the phone is opened in another tab/window

let TransportConnectionTimeout = parseInt(getDbItem("TransportConnectionTimeout", 15));          // The timeout in seconds for the initial connection to make on the web socket port
let TransportReconnectionAttempts = parseInt(getDbItem("TransportReconnectionAttempts", 999));   // The number of times to attempt to reconnect to a WebSocket when the connection drops.
let TransportReconnectionTimeout = parseInt(getDbItem("TransportReconnectionTimeout", 3));       // The time in seconds to wait between WebSocket reconnection attempts.

let SubscribeToYourself = (getDbItem("SubscribeToYourself", "0") == "1");              // Enable Subscribe to your own uri. (Useful to understand how other buddies see you.)
let VoiceMailSubscribe = (getDbItem("VoiceMailSubscribe", "1") == "1");                // Enable Subscribe to voicemail
let VoicemailDid = getDbItem("VoicemailDid", "");                                      // Number to dial for VoicemialMain()
let SubscribeVoicemailExpires = parseInt(getDbItem("SubscribeVoicemailExpires", 300)); // Voceimail Subscription expiry time (in seconds)
let ContactUserName = getDbItem("ContactUserName", "");                                // Optional name for contact header uri
let userAgentStr = getDbItem("UserAgentStr", "Browser Phone "+ appversion +" (SIPJS - "+ sipjsversion +") "+ navUserAgent);   // Set this to whatever you want.
let hostingPrefix = getDbItem("HostingPrefix", "");                                    // Use if hosting off root directory. eg: "/phone/" or "/static/"
let RegisterExpires = parseInt(getDbItem("RegisterExpires", 300));                     // Registration expiry time (in seconds)
let RegisterExtraHeaders = getDbItem("RegisterExtraHeaders", "{}");                    // Parsable Json string of headers to include in register process. eg: '{"foo":"bar"}'
let RegisterExtraContactParams = getDbItem("RegisterExtraContactParams", "{}");        // Parsable Json string of extra parameters add to the end (after >) of contact header during register. eg: '{"foo":"bar"}'
let RegisterContactParams = getDbItem("RegisterContactParams", "{}");                  // Parsable Json string of extra parameters added to contact URI during register. eg: '{"foo":"bar"}'
let WssInTransport = (getDbItem("WssInTransport", "1") == "1");                        // Set the transport parameter to wss when used in SIP URIs. (Required for Asterisk as it doesn't support Path)
let IpInContact = (getDbItem("IpInContact", "1") == "1");                              // Set a random IP address as the host value in the Contact header field and Via sent-by parameter. (Suggested for Asterisk)
let BundlePolicy = getDbItem("BundlePolicy", "balanced");                              // SDP Media Bundle: max-bundle | max-compat | balanced https://webrtcstandards.info/sdp-bundle/
let IceStunServerJson = getDbItem("IceStunServerJson", "");                            // Sets the JSON string for ice Server. Default: [{ "urls": "stun:stun.l.google.com:19302" }] Must be https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration/iceServers
let IceStunCheckTimeout = parseInt(getDbItem("IceStunCheckTimeout", 500));             // Set amount of time in milliseconds to wait for the ICE/STUN server
let SubscribeBuddyAccept = getDbItem("SubscribeBuddyAccept", "application/pidf+xml");  // Normally only application/dialog-info+xml and application/pidf+xml
let SubscribeBuddyEvent = getDbItem("SubscribeBuddyEvent", "presence");                // For application/pidf+xml use presence. For application/dialog-info+xml use dialog 
let SubscribeBuddyExpires = parseInt(getDbItem("SubscribeBuddyExpires", 300));         // Buddy Subscription expiry time (in seconds)
let ProfileDisplayPrefix = getDbItem("ProfileDisplayPrefix", "");                      // Can display an item from your vCard before your name. Options: Number1 | Number2
let ProfileDisplayPrefixSeparator = getDbItem("ProfileDisplayPrefixSeparator", "");    // Used with profileDisplayPrefix, adds a separating character (string). eg: - ~ * or even 💥
let InviteExtraHeaders = getDbItem("InviteExtraHeaders", "{}");                       // Extra SIP headers to be included in the initial INVITE message for each call. (Added to the extra headers in the DialByLine() parameters. e.g {"foo":"bar"})

let NoAnswerTimeout = parseInt(getDbItem("NoAnswerTimeout", 120));          // Time in seconds before automatic Busy Here sent
let AutoAnswerEnabled = (getDbItem("AutoAnswerEnabled", "0") == "1");       // Automatically answers the phone when the call comes in, if you are not on a call already
let DoNotDisturbEnabled = (getDbItem("DoNotDisturbEnabled", "0") == "1");   // Rejects any inbound call, while allowing outbound calls
let CallWaitingEnabled = (getDbItem("CallWaitingEnabled", "1") == "1");     // Rejects any inbound call if you are on a call already.
let RecordAllCalls = (getDbItem("RecordAllCalls", "0") == "1");             // Starts Call Recording when a call is established.
let StartVideoFullScreen = (getDbItem("StartVideoFullScreen", "1") == "1"); // Starts a video call in the full screen (browser screen, not desktop)
let SelectRingingLine = (getDbItem("SelectRingingLine", "1") == "1");       // Selects the ringing line if you are not on another call ()

let UiMaxWidth = parseInt(getDbItem("UiMaxWidth", 1240));                                   // Sets the max-width for the UI elements (don't set this less than 920. Set to very high number for full screen eg: 999999)
let UiThemeStyle = getDbItem("UiThemeStyle", "system");                                     // Sets the color theme for the UI dark | light | system (set by your systems dark/light settings)
let UiMessageLayout = getDbItem("UiMessageLayout", "middle");                               // Put the message Stream at the top or middle can be either: top | middle 
let UiCustomConfigMenu = (getDbItem("UiCustomConfigMenu", "0") == "1");                     // If set to true, will only call web_hook_on_config_menu
let UiCustomDialButton = (getDbItem("UiCustomDialButton", "0") == "1");                     // If set to true, will only call web_hook_dial_out
let UiCustomSortAndFilterButton = (getDbItem("UiCustomSortAndFilterButton", "0") == "1");   // If set to true, will only call web_hook_sort_and_filter
let UiCustomAddBuddy = (getDbItem("UiCustomAddBuddy", "0") == "1");                         // If set to true, will only call web_hook_on_add_buddy
let UiCustomEditBuddy = (getDbItem("UiCustomEditBuddy", "0") == "1");                       // If set to true, will only call web_hook_on_edit_buddy({})
let UiCustomMediaSettings = (getDbItem("UiCustomMediaSettings", "0") == "1");               // If set to true, will only call web_hook_on_edit_media
let UiCustomMessageAction = (getDbItem("UiCustomMessageAction", "0") == "1");               // If set to true, will only call web_hook_on_message_action

let AutoGainControl = (getDbItem("AutoGainControl", "1") == "1");        // Attempts to adjust the microphone volume to a good audio level. (OS may be better at this)
let EchoCancellation = (getDbItem("EchoCancellation", "1") == "1");      // Attempts to remove echo over the line.
let NoiseSuppression = (getDbItem("NoiseSuppression", "1") == "1");      // Attempts to clear the call quality of noise.
let MirrorVideo = getDbItem("VideoOrientation", "rotateY(180deg)");      // Displays the self-preview in normal or mirror view, to better present the preview. 
let maxFrameRate = getDbItem("FrameRate", "");                           // Suggests a frame rate to your webcam if possible.
let videoHeight = getDbItem("VideoHeight", "");                          // Suggests a video height (and therefor picture quality) to your webcam.
let MaxVideoBandwidth = parseInt(getDbItem("MaxVideoBandwidth", "2048")); // Specifies the maximum bandwidth (in Kb/s) for your outgoing video stream. e.g: 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | -1 to disable
let videoAspectRatio = getDbItem("AspectRatio", "1.33");                  // Suggests an aspect ratio (1:1 = 1 | 4:3 = 0.75 | 16:9 = 0.5625) to your webcam.
let NotificationsActive = (getDbItem("Notifications", "0") == "1");

let StreamBuffer = parseInt(getDbItem("StreamBuffer", 50));                 // The amount of rows to buffer in the Buddy Stream
let MaxDataStoreDays = parseInt(getDbItem("MaxDataStoreDays", 0));          // Defines the maximum amount of days worth of data (calls, recordings, messages, etc) to store locally. 0=Stores all data always. >0 Trims n days back worth of data at various events where. 
let PosterJpegQuality = parseFloat(getDbItem("PosterJpegQuality", 0.6));    // The image quality of the Video Poster images
let VideoResampleSize = getDbItem("VideoResampleSize", "HD");               // The resample size (height) to re-render video that gets presented (sent). (SD = ???x360 | HD = ???x720 | FHD = ???x1080)
let RecordingVideoSize = getDbItem("RecordingVideoSize", "HD");             // The size/quality of the video track in the recordings (SD = 640x360 | HD = 1280x720 | FHD = 1920x1080)
let RecordingVideoFps = parseInt(getDbItem("RecordingVideoFps", 12));       // The Frame Per Second of the Video Track recording
let RecordingLayout = getDbItem("RecordingLayout", "them-pnp");             // The Layout of the Recording Video Track (side-by-side | them-pnp | us-only | them-only)

let DidLength = parseInt(getDbItem("DidLength", 6));                 // DID length from which to decide if an incoming caller is a "contact" or an "extension".
let MaxDidLength = parseInt(getDbItem("MaxDidLength", 16));          // Maximum length of any DID number including international dialled numbers.
let DisplayDateFormat = getDbItem("DateFormat", "YYYY-MM-DD");       // The display format for all dates. https://momentjs.com/docs/#/displaying/
let DisplayTimeFormat = getDbItem("TimeFormat", "h:mm:ss A");        // The display format for all times. https://momentjs.com/docs/#/displaying/
let Language = getDbItem("Language", "auto");                        // Overrides the language selector or "automatic". Must be one of availableLang[]. If not defaults to en.

// Buddy Sort and Filter
let BuddySortBy = getDbItem("BuddySortBy", "activity");                      // Sorting for Buddy List display (type|extension|alphabetical|activity)
let SortByTypeOrder = getDbItem("SortByTypeOrder", "e|x|c");                 // If the Sorting is set to type then describe the order of the types.
let BuddyAutoDeleteAtEnd = (getDbItem("BuddyAutoDeleteAtEnd", "0") == "1");  // Always put the Auto Delete buddies at the bottom
let HideAutoDeleteBuddies = (getDbItem("HideAutoDeleteBuddies", "0") == "1");    // Option to not display Auto Delete Buddies (May be confusing if newly created buddies are set to auto delete.)
let BuddyShowExtenNum = (getDbItem("BuddyShowExtenNum", "0") == "1");        // Controls the Extension Number display

// Permission Settings
let EnableTextMessaging = (getDbItem("EnableTextMessaging", "1") == "1");               // Enables the Text Messaging
let DisableFreeDial = (getDbItem("DisableFreeDial", "0") == "1");                       // Removes the Dial icon in the profile area, users will need to add buddies in order to dial.
let DisableBuddies = (getDbItem("DisableBuddies", "0") == "1");                         // Removes the Add Someone menu item and icon from the profile area. Buddies will still be created automatically. Please also use MaxBuddies or MaxBuddyAge
let EnableTransfer = (getDbItem("EnableTransfer", "1") == "1");                         // Controls Transferring during a call
let EnableConference = (getDbItem("EnableConference", "1") == "1");                     // Controls Conference during a call
let AutoAnswerPolicy = getDbItem("AutoAnswerPolicy", "allow");                          // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
let DoNotDisturbPolicy = getDbItem("DoNotDisturbPolicy", "allow");                      // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
let CallWaitingPolicy = getDbItem("CallWaitingPolicy", "allow");                        // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
let CallRecordingPolicy = getDbItem("CallRecordingPolicy", "allow");                    // allow = user can choose | disabled = feature is disabled | enabled = feature is always on
let IntercomPolicy = getDbItem("IntercomPolicy", "enabled");                            // disabled = feature is disabled | enabled = feature is always on
let EnableAccountSettings = (getDbItem("EnableAccountSettings", "1") == "1");           // Controls the Account tab in Settings
let EnableAppearanceSettings = (getDbItem("EnableAppearanceSettings", "1") == "1");     // Controls the Appearance tab in Settings
let EnableNotificationSettings = (getDbItem("EnableNotificationSettings", "1") == "1"); // Controls the Notifications tab in Settings
let EnableAlphanumericDial = (getDbItem("EnableAlphanumericDial", "0") == "1");         // Allows calling /[^\da-zA-Z\*\#\+\-\_\.\!\~\'\(\)]/g default is /[^\d\*\#\+]/g 
let EnableVideoCalling = (getDbItem("EnableVideoCalling", "1") == "1");                 // Enables Video during a call
let EnableTextExpressions = (getDbItem("EnableTextExpressions", "1") == "1");           // Enables Expressions (Emoji) glyphs when texting
let EnableTextDictate = (getDbItem("EnableTextDictate", "1") == "1");                   // Enables Dictate (speech-to-text) when texting
let EnableRingtone = (getDbItem("EnableRingtone", "1") == "1");                         // Enables a ring tone when an inbound call comes in.  (media/Ringtone_1.mp3)
let MaxBuddies = parseInt(getDbItem("MaxBuddies", 999));                                // Sets the Maximum number of buddies the system will accept. Older ones get deleted. (Considered when(after) adding buddies)
let MaxBuddyAge = parseInt(getDbItem("MaxBuddyAge", 365));                              // Sets the Maximum age in days (by latest activity). Older ones get deleted. (Considered when(after) adding buddies)
let AutoDeleteDefault = (getDbItem("AutoDeleteDefault", "1") == "1");                   // For automatically created buddies (inbound and outbound), should the buddy be set to AutoDelete.

let ChatEngine = getDbItem("ChatEngine", "SIMPLE");    // Select the chat engine XMPP | SIMPLE

// XMPP Settings
let XmppServer = getDbItem("XmppServer", "");                // FQDN of XMPP server HTTP service";
let XmppWebsocketPort = getDbItem("XmppWebsocketPort", "");  // OpenFire Default : 7443
let XmppWebsocketPath = getDbItem("XmppWebsocketPath", "");  // OpenFire Default : /ws
let XmppDomain = getDbItem("XmppDomain", "");                // The domain of the XMPP server
let profileUser = getDbItem("profileUser", null);            // Username for auth with XMPP Server eg: 100
// XMPP Tenanting
let XmppRealm = getDbItem("XmppRealm", "");                    // To create a tenant like partition in XMPP server all users and buddies will have this realm prepended to their details.
let XmppRealmSeparator = getDbItem("XmppRealmSeparator", "-"); // Separates the realm from the profileUser eg: abc123-100@XmppDomain
// TODO
let XmppChatGroupService = getDbItem("XmppChatGroupService", "conference");

// TODO
let EnableSendFiles = false;          // Enables sending of Images
let EnableSendImages = false;          // Enables sending of Images
let EnableAudioRecording = false;  // Enables the ability to record a voice message
let EnableVideoRecording = false;  // Enables the ability to record a video message
let EnableSms = false;             // Enables SMS sending to the server (requires onward services)
let EnableFax = false;             // Enables Fax sending to the server (requires onward services)
let EnableEmail = false;           // Enables Email sending to the server (requires onward services)

// ===================================================
// Rather don't fiddle with anything beyond this point
// ===================================================

// System variables
// ================
let userAgent = null;
let CanvasCollection = [];
let Buddies = [];
let selectedBuddy = null;
let selectedLine = null;
let windowObj = null;
let alertObj = null;
let confirmObj = null;
let promptObj = null;
let menuObj = null;
let HasVideoDevice = false;
let HasAudioDevice = false;
let HasSpeakerDevice = false;
let AudioinputDevices = [];
let VideoinputDevices = [];
let SpeakerDevices = [];
let Lines = [];
let lang = {}
let audioBlobs = {}
let newLineNumber = 1;
let telNumericRegEx = /[^\d\*\#\+]/g
let telAlphanumericRegEx = /[^\da-zA-Z\*\#\+\-\_\.\!\~\'\(\)]/g

let settingsMicrophoneStream = null;
let settingsMicrophoneStreamTrack = null;
let settingsMicrophoneSoundMeter = null;

let settingsVideoStream = null;
let settingsVideoStreamTrack = null;

let CallRecordingsIndexDb = null;
let CallQosDataIndexDb = null;

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
    var id = localDB.getItem("RingOutputId");
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
function formatBytes(bytes, decimals) {
    if (bytes === 0) return "0 "+ lang.bytes;
    var k = 1024;
    var dm = (decimals && decimals >= 0)? decimals : 2;
    var sizes = [lang.bytes, lang.kb, lang.mb, lang.gb, lang.tb, lang.pb, lang.eb, lang.zb, lang.yb];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function UserLocale(){
    var language = window.navigator.userLanguage || window.navigator.language; // "en", "en-US", "fr", "fr-FR", "es-ES", etc.
    // langtag = language["-"script]["-" region] *("-" variant) *("-" extension) ["-" privateuse]
    // TODO Needs work
    langtag = language.split('-');
    if(langtag.length == 1){
        return ""; 
    } 
    else if(langtag.length == 2) {
        return langtag[1].toLowerCase();  // en-US => us
    }
    else if(langtag.length >= 3) {
        return langtag[1].toLowerCase();  // en-US => us
    }
}
function GetAlternateLanguage(){
    var userLanguage = window.navigator.userLanguage || window.navigator.language; // "en", "en-US", "fr", "fr-FR", "es-ES", etc.
    // langtag = language["-"script]["-" region] *("-" variant) *("-" extension) ["-" privateuse]
    if(Language != "auto") userLanguage = Language;
    userLanguage = userLanguage.toLowerCase();
    if(userLanguage == "en" || userLanguage.indexOf("en-") == 0) return "";  // English is already loaded

    for(l = 0; l < availableLang.length; l++){
        if(userLanguage.indexOf(availableLang[l].toLowerCase()) == 0){
            console.log("Alternate Language detected: ", userLanguage);
            // Set up Moment with the same language settings
            moment.locale(userLanguage);
            return availableLang[l].toLowerCase();
        }
    }
    return "";
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
$(window).on("beforeunload", function(event) {
    var CurrentCalls = countSessions("0");
    if(CurrentCalls > 0){
        console.warn("Warning, you have current calls open");
        // The best we can do is throw up a system alert question.
        event.preventDefault();
        return event.returnValue = "";
    }
    Unregister(true);
    if(XMPP) XMPP.disconnect("");
});
$(window).on("resize", function() {
    UpdateUI();
});
$(window).on("offline", function(){
    console.warn('Offline!');

    $("#regStatus").html(lang.disconnected_from_web_socket);
    $("#WebRtcFailed").show();

    // If there is an issue with the WS connection
    // We unregister, so that we register again once its up
    console.log("Disconnect Transport...");
    try{
        // userAgent.registerer.unregister();
        userAgent.transport.disconnect();
    } catch(e){
        // I know!!!
    }
});
$(window).on("online", function(){
    console.log('Online!');
    ReconnectTransport();
});
$(window).on("keypress", function(event) {
    // TODO: Add Shortcuts

    // console.log(event);
    if(event.ctrlKey){
        // You have the Ctrl Key pressed, this could be a Call Function
        // Blind Transfer the current Call
        if(event.key == "b"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Start Blind Transfer");
        }
        // Attended Transfer the current Call
        if(event.key == "a"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Start Attended Transfer");
        }
        // Audio Call current selected buddy
        if(event.key == "c"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Start Audio Call");
        }
        // Video Call current selected buddy
        if(event.key == "v"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Start Video Call");
        }
        // Hold (Toggle)
        if(event.key == "h"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Hold Toggle");
        }
        // Mute (Toggle)
        if(event.key == "m"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Mute Toggle");
        }
        // End current call
        if(event.key == "e"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: End current call");
        }
        // Recording (Start/Stop)
        if(event.key == "r"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Recording Toggle");
        }
        // Select line 1-9
        if(event.key == "1" || event.key == "2" | event.key == "3" || event.key == "4" || event.key == "5" || event.key == "6" || event.key == "7" || event.key == "8" || event.key == "9"){
            event.preventDefault();
            console.log("Keyboard Shortcut for: Select Line", event.key);
        }
    }
});
$(document).ready(function () {

    // We will use the IndexDB, so connect to it now, and perform any upgrade options
    PrepareIndexDB();

    // Load phoneOptions
    // =================
    // Note: These options can be defined in the containing HTML page, and simply defined as a global variable
    // var phoneOptions = {} // would work in index.html
    // Even if the setting is defined on the database, these variables get loaded after.

    var options = (typeof phoneOptions !== 'undefined')? phoneOptions : {};
    if(options.welcomeScreen !== undefined) welcomeScreen = options.welcomeScreen;
    if(options.loadAlternateLang !== undefined) loadAlternateLang = options.loadAlternateLang;
    if(options.profileName !== undefined) profileName = options.profileName;
    if(options.imagesDirectory !== undefined) imagesDirectory = options.imagesDirectory;
    if(options.defaultAvatars !== undefined) defaultAvatars = options.defaultAvatars;
    if(options.wallpaperLight !== undefined) wallpaperLight = options.wallpaperLight;
    if(options.wallpaperDark !== undefined) wallpaperDark = options.wallpaperDark;
    if(options.wssServer !== undefined) wssServer = options.wssServer;
    if(options.WebSocketPort !== undefined) WebSocketPort = options.WebSocketPort;
    if(options.ServerPath !== undefined) ServerPath = options.ServerPath;
    if(options.SipDomain !== undefined) SipDomain = options.SipDomain;
    if(options.SipUsername !== undefined) SipUsername = options.SipUsername;
    if(options.SipPassword !== undefined) SipPassword = options.SipPassword;
    if(options.SingleInstance !== undefined) SingleInstance = options.SingleInstance;
    if(options.TransportConnectionTimeout !== undefined) TransportConnectionTimeout = options.TransportConnectionTimeout;
    if(options.TransportReconnectionAttempts !== undefined) TransportReconnectionAttempts = options.TransportReconnectionAttempts;
    if(options.TransportReconnectionTimeout !== undefined) TransportReconnectionTimeout = options.TransportReconnectionTimeout;
    if(options.SubscribeToYourself !== undefined) SubscribeToYourself = options.SubscribeToYourself;
    if(options.VoiceMailSubscribe !== undefined) VoiceMailSubscribe = options.VoiceMailSubscribe;
    if(options.VoicemailDid !== undefined) VoicemailDid = options.VoicemailDid;
    if(options.SubscribeVoicemailExpires !== undefined) SubscribeVoicemailExpires = options.SubscribeVoicemailExpires;
    if(options.ContactUserName !== undefined) ContactUserName = options.ContactUserName;
    if(options.userAgentStr !== undefined) userAgentStr = options.userAgentStr;
    if(options.hostingPrefix !== undefined) hostingPrefix = options.hostingPrefix;
    if(options.RegisterExpires !== undefined) RegisterExpires = options.RegisterExpires;
    if(options.RegisterExtraHeaders !== undefined) RegisterExtraHeaders = options.RegisterExtraHeaders;
    if(options.RegisterExtraContactParams !== undefined) RegisterExtraContactParams = options.RegisterExtraContactParams;
    if(options.RegisterContactParams !== undefined) RegisterContactParams = options.RegisterContactParams;
    if(options.WssInTransport !== undefined) WssInTransport = options.WssInTransport;
    if(options.IpInContact !== undefined) IpInContact = options.IpInContact;
    if(options.BundlePolicy !== undefined) BundlePolicy = options.BundlePolicy;
    if(options.IceStunServerJson !== undefined) IceStunServerJson = options.IceStunServerJson;
    if(options.IceStunCheckTimeout !== undefined) IceStunCheckTimeout = options.IceStunCheckTimeout;
    if(options.SubscribeBuddyAccept !== undefined) SubscribeBuddyAccept = options.SubscribeBuddyAccept;
    if(options.SubscribeBuddyEvent !== undefined) SubscribeBuddyEvent = options.SubscribeBuddyEvent;
    if(options.SubscribeBuddyExpires !== undefined) SubscribeBuddyExpires = options.SubscribeBuddyExpires;
    if(options.ProfileDisplayPrefix !== undefined) ProfileDisplayPrefix = options.ProfileDisplayPrefix;
    if(options.ProfileDisplayPrefixSeparator !== undefined) ProfileDisplayPrefixSeparator = options.ProfileDisplayPrefixSeparator;
    if(options.InviteExtraHeaders !== undefined) InviteExtraHeaders = options.InviteExtraHeaders;
    if(options.NoAnswerTimeout !== undefined) NoAnswerTimeout = options.NoAnswerTimeout;
    if(options.AutoAnswerEnabled !== undefined) AutoAnswerEnabled = options.AutoAnswerEnabled;
    if(options.DoNotDisturbEnabled !== undefined) DoNotDisturbEnabled = options.DoNotDisturbEnabled;
    if(options.CallWaitingEnabled !== undefined) CallWaitingEnabled = options.CallWaitingEnabled;
    if(options.RecordAllCalls !== undefined) RecordAllCalls = options.RecordAllCalls;
    if(options.StartVideoFullScreen !== undefined) StartVideoFullScreen = options.StartVideoFullScreen;
    if(options.SelectRingingLine !== undefined) SelectRingingLine = options.SelectRingingLine;
    if(options.UiMaxWidth !== undefined) UiMaxWidth = options.UiMaxWidth;
    if(options.UiThemeStyle !== undefined) UiThemeStyle = options.UiThemeStyle;
    if(options.UiMessageLayout !== undefined) UiMessageLayout = options.UiMessageLayout;
    if(options.UiCustomConfigMenu !== undefined) UiCustomConfigMenu = options.UiCustomConfigMenu;
    if(options.UiCustomDialButton !== undefined) UiCustomDialButton = options.UiCustomDialButton;
    if(options.UiCustomSortAndFilterButton !== undefined) UiCustomSortAndFilterButton = options.UiCustomSortAndFilterButton;
    if(options.UiCustomAddBuddy !== undefined) UiCustomAddBuddy = options.UiCustomAddBuddy;
    if(options.UiCustomEditBuddy !== undefined) UiCustomEditBuddy = options.UiCustomEditBuddy;
    if(options.UiCustomMediaSettings !== undefined) UiCustomMediaSettings = options.UiCustomMediaSettings;
    if(options.UiCustomMessageAction !== undefined) UiCustomMessageAction = options.UiCustomMessageAction;
    if(options.AutoGainControl !== undefined) AutoGainControl = options.AutoGainControl;
    if(options.EchoCancellation !== undefined) EchoCancellation = options.EchoCancellation;
    if(options.NoiseSuppression !== undefined) NoiseSuppression = options.NoiseSuppression;
    if(options.MirrorVideo !== undefined) MirrorVideo = options.MirrorVideo;
    if(options.maxFrameRate !== undefined) maxFrameRate = options.maxFrameRate;
    if(options.videoHeight !== undefined) videoHeight = options.videoHeight;
    if(options.MaxVideoBandwidth !== undefined) MaxVideoBandwidth = options.MaxVideoBandwidth;
    if(options.videoAspectRatio !== undefined) videoAspectRatio = options.videoAspectRatio;
    if(options.NotificationsActive !== undefined) NotificationsActive = options.NotificationsActive;
    if(options.StreamBuffer !== undefined) StreamBuffer = options.StreamBuffer;
    if(options.PosterJpegQuality !== undefined) PosterJpegQuality = options.PosterJpegQuality;
    if(options.VideoResampleSize !== undefined) VideoResampleSize = options.VideoResampleSize;
    if(options.RecordingVideoSize !== undefined) RecordingVideoSize = options.RecordingVideoSize;
    if(options.RecordingVideoFps !== undefined) RecordingVideoFps = options.RecordingVideoFps;
    if(options.RecordingLayout !== undefined) RecordingLayout = options.RecordingLayout;
    if(options.DidLength !== undefined) DidLength = options.DidLength;
    if(options.MaxDidLength !== undefined) MaxDidLength = options.MaxDidLength;
    if(options.DisplayDateFormat !== undefined) DisplayDateFormat = options.DisplayDateFormat;
    if(options.DisplayTimeFormat !== undefined) DisplayTimeFormat = options.DisplayTimeFormat;
    if(options.Language !== undefined) Language = options.Language;
    if(options.BuddySortBy !== undefined) BuddySortBy = options.BuddySortBy;
    if(options.SortByTypeOrder !== undefined) SortByTypeOrder = options.SortByTypeOrder;
    if(options.BuddyAutoDeleteAtEnd !== undefined) BuddyAutoDeleteAtEnd = options.BuddyAutoDeleteAtEnd;
    if(options.HideAutoDeleteBuddies !== undefined) HideAutoDeleteBuddies = options.HideAutoDeleteBuddies;
    if(options.BuddyShowExtenNum !== undefined) BuddyShowExtenNum = options.BuddyShowExtenNum;
    if(options.EnableTextMessaging !== undefined) EnableTextMessaging = options.EnableTextMessaging;
    if(options.DisableFreeDial !== undefined) DisableFreeDial = options.DisableFreeDial;
    if(options.DisableBuddies !== undefined) DisableBuddies = options.DisableBuddies;
    if(options.EnableTransfer !== undefined) EnableTransfer = options.EnableTransfer;
    if(options.EnableConference !== undefined) EnableConference = options.EnableConference;
    if(options.AutoAnswerPolicy !== undefined) AutoAnswerPolicy = options.AutoAnswerPolicy;
    if(options.DoNotDisturbPolicy !== undefined) DoNotDisturbPolicy = options.DoNotDisturbPolicy;
    if(options.CallWaitingPolicy !== undefined) CallWaitingPolicy = options.CallWaitingPolicy;
    if(options.CallRecordingPolicy !== undefined) CallRecordingPolicy = options.CallRecordingPolicy;
    if(options.IntercomPolicy !== undefined) IntercomPolicy = options.IntercomPolicy;
    if(options.EnableAccountSettings !== undefined) EnableAccountSettings = options.EnableAccountSettings;
    if(options.EnableAppearanceSettings !== undefined) EnableAppearanceSettings = options.EnableAppearanceSettings;
    if(options.EnableNotificationSettings !== undefined) EnableNotificationSettings = options.EnableNotificationSettings;
    if(options.EnableAlphanumericDial !== undefined) EnableAlphanumericDial = options.EnableAlphanumericDial;
    if(options.EnableVideoCalling !== undefined) EnableVideoCalling = options.EnableVideoCalling;
    if(options.EnableTextExpressions !== undefined) EnableTextExpressions = options.EnableTextExpressions;
    if(options.EnableTextDictate !== undefined) EnableTextDictate = options.EnableTextDictate;
    if(options.EnableRingtone !== undefined) EnableRingtone = options.EnableRingtone;
    if(options.MaxBuddies !== undefined) MaxBuddies = options.MaxBuddies;
    if(options.MaxBuddyAge !== undefined) MaxBuddyAge = options.MaxBuddyAge;
    if(options.ChatEngine !== undefined) ChatEngine = options.ChatEngine;
    if(options.XmppServer !== undefined) XmppServer = options.XmppServer;
    if(options.XmppWebsocketPort !== undefined) XmppWebsocketPort = options.XmppWebsocketPort;
    if(options.XmppWebsocketPath !== undefined) XmppWebsocketPath = options.XmppWebsocketPath;
    if(options.XmppDomain !== undefined) XmppDomain = options.XmppDomain;
    if(options.profileUser !== undefined) profileUser = options.profileUser;
    if(options.XmppRealm !== undefined) XmppRealm = options.XmppRealm;
    if(options.XmppRealmSeparator !== undefined) XmppRealmSeparator = options.XmppRealmSeparator;
    if(options.XmppChatGroupService !== undefined) XmppChatGroupService = options.XmppChatGroupService;

    // Single Instance Check 
    if(SingleInstance == true){
        console.log("Instance ID :", instanceID);
        // First we set (or try to set) the instance ID
        localDB.setItem("InstanceId", instanceID);

        // Now we attach a listener
        window.addEventListener('storage', onLocalStorageEvent, false);
    }

    // Load Language File
    // ==================
    $.getJSON(hostingPrefix + "lang/en.json", function(data){
        lang = data;
        if(typeof web_hook_on_language_pack_loaded !== 'undefined') web_hook_on_language_pack_loaded(lang);
        if(loadAlternateLang == true){
            var userLang = GetAlternateLanguage();
            if(userLang != ""){
                console.log("Loading Alternate Language Pack: ", userLang);
                $.getJSON(hostingPrefix +"lang/"+ userLang +".json", function (alt_data){
                    if(typeof web_hook_on_language_pack_loaded !== 'undefined') web_hook_on_language_pack_loaded(alt_data);
                    lang = alt_data;
                }).always(function() {
                    console.log("Alternate Language Pack loaded: ", lang);
                    InitUi();
                });
            }
            else {
                console.log("No Alternate Language Found.");
                InitUi();
            }
        }
        else {
            InitUi();
        }
    });
});
if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
        console.log(`Changed system Theme to: ${e.matches ? "dark" : "light"} mode`)
        ApplyThemeColor()
    });
}
function onLocalStorageEvent(event){
    if(event.key == "InstanceId"){
        // Another script is writing to the local storage,
        // because the event lister is attached after the 
        // Instance ID, its from another window/tab/script.

        // Because you cannot change focus to another tab (even
        // from a tab with the same domain), and because you cannot
        // close a tab, the best we can do is de-register this
        // UserAgent, so that we are only registered here.

        Unregister();
        // TOO: what if you re-register?
        // Should this unload the entire page, what about calls? 
    }
}
function PrepareIndexDB(){

    // CallQosData
    // ===========
    const CallQosDataOpenRequest = window.indexedDB.open("CallQosData", 1);
    // If this is the first visit to this page, this would have now made an empty IndexDB
    CallQosDataOpenRequest.onerror = function(event) {
        console.error("CallQosData DBOpenRequest Error:", event);
    }
    CallQosDataOpenRequest.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for CallQosData IndexDB... probably because of first time use.");
        CallQosDataIndexDb = event.target.result;
        // Now the CallQosDataIndexDb is activated, but its still empty

        if(CallQosDataIndexDb.objectStoreNames.contains("CallQos") == false){
            // Create Object Store
            var objectStore = CallQosDataIndexDb.createObjectStore("CallQos", { keyPath: "uID" });
            objectStore.createIndex("sessionid", "sessionid", { unique: false });
            objectStore.createIndex("buddy", "buddy", { unique: false });
            objectStore.createIndex("QosData", "QosData", { unique: false });
            console.log("IndexDB created ObjectStore CallQos");
        }
        else {
            console.warn("IndexDB requested upgrade, but object store was in place");
        }
        // Will fire .onsuccess now
    }
    CallQosDataOpenRequest.onsuccess = function(event) {
        CallQosDataIndexDb = event.target.result;

        CallQosDataIndexDb.onerror = function(event) {
            console.error("IndexDB Error:", event);
        }

        if(CallQosDataIndexDb.objectStoreNames.contains("CallQos") == false){
            console.warn("IndexDB is open but CallQos does not exist.");
            // Close the connection to the database
            CallQosDataIndexDb.close();
            console.log("IndexDB is closed.");
            // Drop the Database
            const DBDeleteRequest = window.indexedDB.deleteDatabase("CallQos");
            DBDeleteRequest.onerror = function(event) {
                console.error("Error deleting database CallQos");
            }
            DBDeleteRequest.onsuccess = function(event) {
                console.log("Database deleted successfully");

                // Call the PrepareIndexDB() function again, this time it should make the DB correctly.
                window.setTimeout(function(){
                    // This could create a loop if the database keeps failing to create correctly.
                    PrepareIndexDB();
                },500);
            }
            return;
        }
        console.log("IndexDB connected to CallQosData");
    }

    // Call Recordings
    // ===============
    const CallRecordingsOpenRequest = window.indexedDB.open("CallRecordings", 1);
    // If this is the first visit to this page, this would have now made an empty IndexDB
    CallRecordingsOpenRequest.onerror = function(event) {
        console.error("CallRecordings DBOpenRequest Error:", event);
    }
    CallRecordingsOpenRequest.onupgradeneeded = function(event) {
        console.warn("Upgrade Required for CallRecordings IndexDB... probably because of first time use.");
        CallRecordingsIndexDb = event.target.result;
        // Now the CallRecordingsIndexDb is activated, but its still empty

        if(CallRecordingsIndexDb.objectStoreNames.contains("Recordings") == false){
            // Create Object Store (Note: This can only be done here .onupgradeneeded)
            var objectStore = CallRecordingsIndexDb.createObjectStore("Recordings", { keyPath: "uID" });
            objectStore.createIndex("sessionid", "sessionid", { unique: false });
            objectStore.createIndex("bytes", "bytes", { unique: false });
            objectStore.createIndex("type", "type", { unique: false });
            objectStore.createIndex("mediaBlob", "mediaBlob", { unique: false });
            console.log("IndexDB created ObjectStore Recordings");
        }
        else {
            console.warn("IndexDB requested upgrade, but object store was in place");
        }
        // Will fire .onsuccess now
    }
    CallRecordingsOpenRequest.onsuccess = function(event) {
        CallRecordingsIndexDb = event.target.result;

        CallRecordingsIndexDb.onerror = function(event) {
            console.error("IndexDB Error:", event);
        }

        // Double check structure
        if(CallRecordingsIndexDb.objectStoreNames.contains("Recordings") == false){
            console.warn("IndexDB is open but Recordings does not exist.");
            // Close the connection to the database
            CallRecordingsIndexDb.close();
            console.log("IndexDB is closed.");
            // Drop the Database
            const DBDeleteRequest = window.indexedDB.deleteDatabase("CallRecordings");
            DBDeleteRequest.onerror = function(event) {
                console.error("Error deleting database CallRecordings");
            }
            DBDeleteRequest.onsuccess = function(event) {
                console.log("Database deleted successfully");

                // Call the PrepareIndexDB() function again, this time it should make the DB correctly.
                window.setTimeout(function(){
                    // This could create a loop if the database keeps failing to create correctly.
                    PrepareIndexDB();
                },500);
            }
            return;
        }
        console.log("IndexDB connected to CallRecordings");
    }
}

// User Interface
// ==============
function UpdateUI(){
    var windowWidth = $(window).outerWidth()
    var windowHeight = $(window).outerHeight();
    if(windowWidth > UiMaxWidth){
        $("#leftContentTable").css("border-left-width", "1px");
        if(selectedBuddy == null && selectedLine == null) {
            $("#leftContentTable").css("border-right-width", "1px");
        } else {
            $("#rightContent").css("border-right-width", "1px");
        }
    } else {
        // Touching Edges
        $("#leftContentTable").css("border-left-width", "0px");
        if(selectedBuddy == null && selectedLine == null) {
            $("#leftContentTable").css("border-right-width", "0px");
        } else {
            $("#leftContentTable").css("border-right-width", "1px");
        }
        $("#rightContent").css("border-right-width", "0px");
    }

    if(windowWidth < 920){
        // Narrow Layout

        if(selectedBuddy == null & selectedLine == null) {
            // Nobody Selected (SHow Only Left Table)
            $("#rightContent").hide();

            $("#leftContent").css("width", "100%");
            $("#leftContent").show();
        }
        else {
            // Nobody Selected (SHow Only Buddy / Line)
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
    for(var l=0; l<Lines.length; l++){
        updateLineScroll(Lines[l].LineNumber);
        RedrawStage(Lines[l].LineNumber, false);
    }

    if(windowObj != null){
        var offsetTextHeight = windowObj.parent().outerHeight();
        var width = windowObj.width();
        if(windowWidth <= width || windowHeight <= offsetTextHeight) {
            // First apply to dialog, then set css
            windowObj.dialog("option", "height", windowHeight);
            windowObj.dialog("option", "width", windowWidth - (1+1+2+2)); // There is padding and a border
            windowObj.parent().css('top', '0px');
            windowObj.parent().css('left', '0px');
        } 
        else {
            windowObj.parent().css('left', windowWidth/2 - width/2 + 'px');
            windowObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
        }
    }
    if(alertObj != null){
        var width = 300;
        var offsetTextHeight = alertObj.parent().outerHeight();
        if(windowWidth <= width || windowHeight <= offsetTextHeight) {
            if(windowWidth <= width){
                // First apply to dialog, then set css
                alertObj.dialog("option", "width", windowWidth - (1+1+2+2));
                alertObj.parent().css('left', '0px');
                alertObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
            }
            if(windowHeight <= offsetTextHeight){
                // First apply to dialog, then set css
                alertObj.dialog("option", "height", windowHeight);
                alertObj.parent().css('left', windowWidth/2 - width/2 + 'px');
                alertObj.parent().css('top', '0px');
            }
        }
        else {
            alertObj.parent().css('left', windowWidth/2 - width/2 + 'px');
            alertObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
        }
    }
    if(confirmObj != null){
        var width = 300;
        var offsetTextHeight = confirmObj.parent().outerHeight();
        if(windowWidth <= width || windowHeight <= offsetTextHeight) {
            if(windowWidth <= width){
                // First apply to dialog, then set css
                confirmObj.dialog("option", "width", windowWidth - (1+1+2+2));
                confirmObj.parent().css('left', '0px');
                confirmObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
            }
            if(windowHeight <= offsetTextHeight){
                // First apply to dialog, then set css
                confirmObj.dialog("option", "height", windowHeight);
                confirmObj.parent().css('left', windowWidth/2 - width/2 + 'px');
                confirmObj.parent().css('top', '0px');
            }
        }
        else {
            confirmObj.parent().css('left', windowWidth/2 - width/2 + 'px');
            confirmObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
        }
    }
    if(promptObj != null){
        var width = 300;
        var offsetTextHeight = promptObj.parent().outerHeight();
        if(windowWidth <= width || windowHeight <= offsetTextHeight) {
            if(windowWidth <= width){
                // First apply to dialog, then set css
                promptObj.dialog("option", "width", windowWidth - (1+1+2+2));
                promptObj.parent().css('left', '0px');
                promptObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
            }
            if(windowHeight <= offsetTextHeight){
                // First apply to dialog, then set css
                promptObj.dialog("option", "height", windowHeight);
                promptObj.parent().css('left', windowWidth/2 - width/2 + 'px');
                promptObj.parent().css('top', '0px');
            }
        }
        else {
            promptObj.parent().css('left', windowWidth/2 - width/2 + 'px');
            promptObj.parent().css('top', windowHeight/2 - offsetTextHeight/2 + 'px');
        }
    }
    HidePopup();
}

// UI Windows
// ==========
function AddSomeoneWindow(numberStr){
    CloseUpSettings();

    $("#myContacts").hide();
    $("#searchArea").hide();
    $("#actionArea").empty();

    var html = "<div style=\"text-align:right\"><button class=roundButtons onclick=\"ShowContacts()\"><i class=\"fa fa-close\"></i></button></div>"
    
    html += "<div border=0 class=UiSideField>";

    html += "<div class=UiText>"+ lang.full_name +":</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='"+ lang.eg_full_name +"'></div>";
    html += "<div><input type=checkbox id=AddSomeone_Dnd><label for=AddSomeone_Dnd>"+ lang.allow_calls_on_dnd +"</label></div>";

    // Type
    html += "<ul style=\"list-style-type:none\">";
    html += "<li><input type=radio name=buddyType id=type_exten checked><label for=type_exten>"+ lang.basic_extension +"</label>";
    if(ChatEngine == "XMPP"){
        html += "<li><input type=radio name=buddyType id=type_xmpp><label for=type_xmpp>"+ lang.extension_including_xmpp +"</label>";
    }
    html += "<li><input type=radio name=buddyType id=type_contact><label for=type_contact>"+ lang.addressbook_contact +"</label>";
    html += "</ul>";

    html += "<div id=RowDescription>";
    html += "<div class=UiText>"+ lang.title_description +":</div>";
    html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"'></div>";
    html += "</div>";

    html += "<div id=RowExtension>";
    html += "<div class=UiText>"+ lang.extension_number +":</div>";
    html += "<div><input id=AddSomeone_Exten class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"'></div>";
    html += "<div><input type=checkbox id=AddSomeone_Subscribe><label for=AddSomeone_Subscribe>"+ lang.subscribe_to_dev_state +"</label></div>";
    html += "<div id=RowSubscribe style=\"display:none; margin-left:30px;\">";
    html += "<div class=UiText>"+ lang.internal_subscribe_extension +":</div>";
    html += "<div><input id=AddSomeone_SubscribeUser class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"'></div>";
    html += "</div>";
    html += "</div>";

    html += "<div id=RowMobileNumber>";
    html += "<div class=UiText>"+ lang.mobile_number +":</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=tel placeholder='"+ lang.eg_mobile_number +"'></div>";
    html += "</div>";

    html += "<div id=RowEmail>";
    html += "<div class=UiText>"+ lang.email +":</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=email placeholder='"+ lang.eg_email +"'></div>";
    html += "</div>";

    html += "<div id=RowContact1>";
    html += "<div class=UiText>"+ lang.contact_number_1 +":</div>";
    html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_1 +"'></div>";
    html += "</div>";

    html += "<div id=RowContact2>";
    html += "<div class=UiText>"+ lang.contact_number_2 +":</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_2 +"'></div>";
    html += "</div>";

    html += "<div id=Persistance>";
    html += "<div class=UiText>Auto Delete:</div>";
    html += "<div><input type=checkbox id=AddSomeone_AutoDelete><label for=AddSomeone_AutoDelete>"+ lang.yes +"</label></div>";
    html += "</div>";

    html += "</div>";

    html += "<div class=UiWindowButtonBar id=ButtonBar></div>";

    $("#actionArea").html(html);

    // Button Actions
    var buttons = [];
    buttons.push({
        text: lang.add,
        action: function(){
            // Basic Validation
            if($("#AddSomeone_Name").val() == "") return;
            if(type == "extension" || type == "xmpp"){
                if($("#AddSomeone_Exten").val() == "") return;
            }

            var type = "extension";
            if($("#type_exten").is(':checked')){
                type = "extension";
                if($("#AddSomeone_Subscribe").is(':checked') && $("#AddSomeone_SubscribeUser").val() == ""){
                    $("#AddSomeone_SubscribeUser").val($("#AddSomeone_Exten").val())
                }
            } else if($("#type_xmpp").is(':checked')){
                type = "xmpp";
                if($("#AddSomeone_Subscribe").is(':checked') && $("#AddSomeone_SubscribeUser").val() == ""){
                    $("#AddSomeone_SubscribeUser").val($("#AddSomeone_Exten").val())
                }
            } else if($("#type_contact").is(':checked')){
                type = "contact";
            }

            // Add Contact / Extension
            var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
            if(json == null) json = InitUserBuddies();

            var buddyObj = null;
            if(type == "extension"){
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
                        jid: null,
                        DisplayName: $("#AddSomeone_Name").val(),
                        Description: $("#AddSomeone_Desc").val(),
                        Email: $("#AddSomeone_Email").val(),
                        MemberCount: 0,
                        EnableDuringDnd: $("#AddSomeone_Dnd").is(':checked'),
                        Subscribe: $("#AddSomeone_Subscribe").is(':checked'),
                        SubscribeUser: $("#AddSomeone_SubscribeUser").val(),
                        AutoDelete: $("#AddSomeone_AutoDelete").is(':checked')
                    }
                );
                buddyObj = new Buddy("extension", 
                                        id, 
                                        $("#AddSomeone_Name").val(), 
                                        $("#AddSomeone_Exten").val(), 
                                        $("#AddSomeone_Mobile").val(), 
                                        $("#AddSomeone_Num1").val(), 
                                        $("#AddSomeone_Num2").val(), 
                                        dateNow, 
                                        $("#AddSomeone_Desc").val(), 
                                        $("#AddSomeone_Email").val(), 
                                        jid, 
                                        $("#AddSomeone_Dnd").is(':checked'), 
                                        $("#AddSomeone_Subscribe").is(':checked'),
                                        $("#AddSomeone_SubscribeUser").val(),
                                        $("#AddSomeone_AutoDelete").is(':checked'));
                
                // Add memory object
                AddBuddy(buddyObj, false, false, $("#AddSomeone_Subscribe").is(':checked'), true);
            }
            if(type == "xmpp"){
                // Add XMPP extension
                var id = uID();
                var dateNow = utcDateNow();
                var jid = $("#AddSomeone_Exten").val() +"@"+ SipDomain;
                if(XmppRealm != "" && XmppRealmSeparator != "") jid = XmppRealm +""+ XmppRealmSeparator +""+ jid;
                json.DataCollection.push(
                    {
                        Type: "xmpp", 
                        LastActivity: dateNow,
                        ExtensionNumber: $("#AddSomeone_Exten").val(), 
                        MobileNumber: null,
                        ContactNumber1: null,
                        ContactNumber2: null,
                        uID: id,
                        cID: null,
                        gID: null,
                        jid: jid,
                        DisplayName: $("#AddSomeone_Name").val(),
                        Description: null,
                        Email: null,
                        MemberCount: 0,
                        EnableDuringDnd: $("#AddSomeone_Dnd").is(':checked'),
                        Subscribe: $("#AddSomeone_Subscribe").is(':checked'),
                        SubscribeUser: $("#AddSomeone_SubscribeUser").val(),
                        AutoDelete: $("#AddSomeone_AutoDelete").is(':checked')
                    }
                );
                buddyObj = new Buddy("xmpp", 
                                        id, 
                                        $("#AddSomeone_Name").val(), 
                                        $("#AddSomeone_Exten").val(), 
                                        "", 
                                        "", 
                                        "", 
                                        dateNow, 
                                        "", 
                                        "", 
                                        jid, 
                                        $("#AddSomeone_Dnd").is(':checked'), 
                                        $("#AddSomeone_Subscribe").is(':checked'),
                                        $("#AddSomeone_SubscribeUser").val(),
                                        $("#AddSomeone_AutoDelete").is(':checked'));
                
                // XMPP add to roster
                XmppAddBuddyToRoster(buddyObj);

                // Add memory object
                AddBuddy(buddyObj, false, false, $("#AddSomeone_Subscribe").is(':checked'), true);
            }
            if(type == "contact"){
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
                        jid: null,
                        DisplayName: $("#AddSomeone_Name").val(),
                        Description: $("#AddSomeone_Desc").val(),
                        Email: $("#AddSomeone_Email").val(),
                        MemberCount: 0,
                        EnableDuringDnd: $("#AddSomeone_Dnd").is(':checked'),
                        Subscribe: false,
                        SubscribeUser: null,
                        AutoDelete: $("#AddSomeone_AutoDelete").is(':checked')
                    }
                );
                buddyObj = new Buddy("contact", 
                                        id, 
                                        $("#AddSomeone_Name").val(), 
                                        "", 
                                        $("#AddSomeone_Mobile").val(), 
                                        $("#AddSomeone_Num1").val(), 
                                        $("#AddSomeone_Num2").val(), 
                                        dateNow, 
                                        $("#AddSomeone_Desc").val(), 
                                        $("#AddSomeone_Email").val(), 
                                        jid, 
                                        $("#AddSomeone_Dnd").is(':checked'), 
                                        false,
                                        null,
                                        $("#AddSomeone_AutoDelete").is(':checked'));

                // Add memory object
                AddBuddy(buddyObj, false, false, false, true);
            }

            // Save To DB
            json.TotalRows = json.DataCollection.length;
            localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

            UpdateBuddyList();

            ShowContacts();
        }
    });
    buttons.push({
        text: lang.cancel,
        action: function(){
            ShowContacts();
        }
    });
    $.each(buttons, function(i,obj){
        var button = $('<button>'+ obj.text +'</button>').click(obj.action);
        $("#ButtonBar").append(button);
    });

    // Show
    $("#actionArea").show();
    $("#AddSomeone_Name").focus();

    // Do Onload
    window.setTimeout(function(){
        $("#type_exten").change(function(){
            if($("#type_exten").is(':checked')){
                $("#RowDescription").show();
                $("#RowExtension").show();
                $("#RowMobileNumber").show();
                $("#RowEmail").show();
                $("#RowContact1").show();
                $("#RowContact2").show();
            }
        });
        $("#type_xmpp").change(function(){
            if($("#type_xmpp").is(':checked')){
                $("#RowDescription").hide();
                $("#RowExtension").show();
                $("#RowMobileNumber").hide();
                $("#RowEmail").hide();
                $("#RowContact1").hide();
                $("#RowContact2").hide();
            }
        });
        $("#type_contact").change(function(){
            if($("#type_contact").is(':checked')){
                $("#RowDescription").show();
                $("#RowExtension").hide();
                $("#RowMobileNumber").show();
                $("#RowEmail").show();
                $("#RowContact1").show();
                $("#RowContact2").show();
            }
        });
        $("#AddSomeone_Subscribe").change(function(){
            if($("#AddSomeone_Subscribe").is(':checked')){
                if($("#AddSomeone_Exten").val() != "" && $("#AddSomeone_SubscribeUser").val() == ""){
                    $("#AddSomeone_SubscribeUser").val($("#AddSomeone_Exten").val());
                }
                $("#RowSubscribe").show();
            } else {
                $("#RowSubscribe").hide();
            }
        });
    }, 0);
}
function CreateGroupWindow(){
    // lang.create_group
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

    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null){
        Alert(lang.alert_not_found, lang.error);
        return;
    }
    var buddyJson = {};
    var itemId = -1;
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    $.each(json.DataCollection, function (i, item) {
        if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
            buddyJson = item;
            itemId = i;
            return false;
        }
    });

    if(buddyJson == {}){
        Alert(lang.alert_not_found, lang.error);
        return;
    }
    if(UiCustomEditBuddy == true){
        if(typeof web_hook_on_edit_buddy !== 'undefined') {
            web_hook_on_edit_buddy(buddyJson);
        }
        return;
    }

    var cropper;

    var html = "<div border=0 class='UiWindowField'>";

    html += "<div id=ImageCanvas style=\"width:150px; height:150px\"></div>";
    html += "<div style=\"float:left; margin-left:200px;\"><input id=fileUploader type=file></div>";
    html += "<div style=\"margin-top: 50px\"></div>";
    
    html += "<div class=UiText>"+ lang.full_name +":</div>";
    html += "<div><input id=AddSomeone_Name class=UiInputText type=text placeholder='"+ lang.eg_full_name +"' value='"+ ((buddyJson.DisplayName && buddyJson.DisplayName != "null" && buddyJson.DisplayName != "undefined")? buddyJson.DisplayName : "") +"'></div>";
    html += "<div><input type=checkbox id=AddSomeone_Dnd "+ ((buddyJson.EnableDuringDnd == true)? "checked" : "" ) +"><label for=AddSomeone_Dnd>Allow calls while on Do Not Disturb</label></div>";

    html += "<div class=UiText>"+ lang.title_description +":</div>";
    html += "<div><input id=AddSomeone_Desc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"' value='"+ ((buddyJson.Description && buddyJson.Description != "null" && buddyJson.Description != "undefined")? buddyJson.Description : "") +"'></div>";

    if(buddyJson.Type == "extension" || buddyJson.Type == "xmpp"){
        html += "<div class=UiText>"+ lang.extension_number +": </div>";
        html += "<div><input id=AddSomeone_Exten class=UiInputText type=text value="+ buddyJson.ExtensionNumber +"></div>";
        html += "<div><input type=checkbox id=AddSomeone_Subscribe "+ ((buddyJson.Subscribe == true)? "checked" : "" ) +"><label for=AddSomeone_Subscribe>Subscribe to Device State Notifications</label></div>";
        html += "<div id=RowSubscribe style=\"display:"+ ((buddyJson.Subscribe == true)? "unset" : "none" ) +";\">";
        html += "<div class=UiText style=\"margin-left:30px\">"+ lang.internal_subscribe_extension +":</div>";
        html += "<div style=\"margin-left:30px\"><input id=AddSomeone_SubscribeUser class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"' value='"+ ((buddyJson.SubscribeUser && buddyJson.SubscribeUser != "null" && buddyJson.SubscribeUser != "undefined")? buddyJson.SubscribeUser : "") +"'></div>";
        html += "</div>";
    }
    else {
        html += "<input type=checkbox id=AddSomeone_Subscribe style=\"display:none\">";
    }
    html += "<div class=UiText>"+ lang.mobile_number +":</div>";
    html += "<div><input id=AddSomeone_Mobile class=UiInputText type=text placeholder='"+ lang.eg_mobile_number +"' value='"+ ((buddyJson.MobileNumber && buddyJson.MobileNumber != "null" && buddyJson.MobileNumber != "undefined")? buddyJson.MobileNumber : "") +"'></div>";

    html += "<div class=UiText>"+ lang.email +":</div>";
    html += "<div><input id=AddSomeone_Email class=UiInputText type=text placeholder='"+ lang.eg_email +"' value='"+ ((buddyJson.Email && buddyJson.Email != "null" && buddyJson.Email != "undefined")? buddyJson.Email : "") +"'></div>";

    html += "<div class=UiText>"+ lang.contact_number_1 +":</div>";
    html += "<div><input id=AddSomeone_Num1 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_1 +"' value='"+((buddyJson.ContactNumber1 && buddyJson.ContactNumber1 != "null" && buddyJson.ContactNumber1 != "undefined")? buddyJson.ContactNumber1 : "") +"'></div>";

    html += "<div class=UiText>"+ lang.contact_number_2 +":</div>";
    html += "<div><input id=AddSomeone_Num2 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_2 +"' value='"+ ((buddyJson.ContactNumber2 && buddyJson.ContactNumber2 != "null" && buddyJson.ContactNumber2 != "undefined")? buddyJson.ContactNumber2 : "") +"'></div>";

    html += "<div class=UiText>Auto Delete:</div>";
    html += "<div><input type=checkbox id=AddSomeone_AutoDelete "+ ((buddyJson.AutoDelete == true)? "checked" : "" ) +"><label for=AddSomeone_AutoDelete>"+ lang.yes +"</label></div>";

    // TODO, add option to delete data, etc, etc
    html += "<div class=UiText><button onclick=\"RemoveBuddy('"+ buddyObj.identity +"')\" class=\"UiDeleteButton\"><i class=\"fa fa-trash\"></i> "+ lang.delete_buddy +"</button></div>";

    html += "</div>"

    OpenWindow(html, lang.edit, 480, 640, false, true, lang.save, function(){

        if($("#AddSomeone_Name").val() == "") return;
        if($("#AddSomeone_Subscribe").is(':checked')){
            if($("#AddSomeone_Exten").val() != "" && $("#AddSomeone_SubscribeUser").val() == ""){
                $("#AddSomeone_SubscribeUser").val($("#AddSomeone_Exten").val());
            }
        }

        buddyJson.LastActivity = utcDateNow();
        buddyObj.lastActivity = buddyJson.LastActivity;

        buddyJson.DisplayName = $("#AddSomeone_Name").val();
        buddyObj.CallerIDName = buddyJson.DisplayName;

        buddyJson.Description = $("#AddSomeone_Desc").val();
        buddyObj.Desc = buddyJson.Description;

        buddyJson.MobileNumber = $("#AddSomeone_Mobile").val();
        buddyObj.MobileNumber = buddyJson.MobileNumber;

        buddyJson.Email = $("#AddSomeone_Email").val();
        buddyObj.Email = buddyJson.Email;

        buddyJson.ContactNumber1 = $("#AddSomeone_Num1").val();
        buddyObj.ContactNumber1 = buddyJson.ContactNumber1;

        buddyJson.ContactNumber2 = $("#AddSomeone_Num2").val();
        buddyObj.ContactNumber2 = buddyJson.ContactNumber2;

        buddyJson.EnableDuringDnd = $("#AddSomeone_Dnd").is(':checked');
        buddyObj.EnableDuringDnd = buddyJson.EnableDuringDnd;

        buddyJson.AutoDelete = $("#AddSomeone_AutoDelete").is(':checked');
        buddyObj.AllowAutoDelete = buddyJson.AutoDelete;

        if(buddyJson.Type == "extension" || buddyJson.Type == "xmpp"){
            // First Unsubscribe old information
            UnsubscribeBuddy(buddyObj);

            buddyJson.ExtensionNumber = $("#AddSomeone_Exten").val();
            buddyObj.ExtNo = buddyJson.ExtensionNumber;

            buddyJson.Subscribe = $("#AddSomeone_Subscribe").is(':checked');
            buddyObj.EnableSubscribe = buddyJson.Subscribe;

            if(buddyJson.Subscribe == true){
                var SubscribeUser = $("#AddSomeone_SubscribeUser").val();
                buddyJson.SubscribeUser = SubscribeUser;
                buddyObj.SubscribeUser = SubscribeUser;

                // Subscribe Actions
                SubscribeBuddy(buddyObj);
            }
        }

        // Update Visible Elements
        UpdateBuddyList();

        // Update Image
        var constraints = { 
            type: 'base64', 
            size: 'viewport', 
            format: 'webp',  // png
            quality: 0.5, 
            circle: false 
        }
        $("#ImageCanvas").croppie('result', constraints).then(function(base64) {
            // Image processing done
            if(buddyJson.Type == "extension"){
                console.log("Saving image for extension buddy:", buddyJson.uID)
                localDB.setItem("img-"+ buddyJson.uID +"-extension", base64);
                // Update Images
                $("#contact-"+ buddyJson.uID +"-picture").css("background-image", 'url('+ getPicture(buddyJson.uID, 'extension', true) +')');
                $("#contact-"+ buddyJson.uID +"-picture-main").css("background-image", 'url('+ getPicture(buddyJson.uID, 'extension', true) +')');
            }
            else if(buddyJson.Type == "contact") {
                console.log("Saving image for contact buddy:", buddyJson.cID)
                localDB.setItem("img-"+ buddyJson.cID +"-contact", base64);
                // Update Images
                $("#contact-"+ buddyJson.cID +"-picture").css("background-image", 'url('+ getPicture(buddyJson.cID, 'contact', true) +')');
                $("#contact-"+ buddyJson.cID +"-picture-main").css("background-image", 'url('+ getPicture(buddyJson.cID, 'contact', true) +')');
            }
            else if(buddyJson.Type == "group") {
                console.log("Saving image for group buddy:", buddyJson.gID)
                localDB.setItem("img-"+ buddyJson.gID +"-group", base64);
                // Update Images
                $("#contact-"+ buddyJson.gID +"-picture").css("background-image", 'url('+ getPicture(buddyJson.gID, 'group', true) +')');
                $("#contact-"+ buddyJson.gID +"-picture-main").css("background-image", 'url('+ getPicture(buddyJson.gID, 'group', true) +')');
            }
            // Update
            UpdateBuddyList();
        });

        // Update: 
        json.DataCollection[itemId] = buddyJson;

        // Save To DB
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

        CloseWindow();
    }, lang.cancel, function(){
        CloseWindow();
    }, function(){
        // DoOnLoad
        cropper = $("#ImageCanvas").croppie({
            viewport: { width: 150, height: 150, type: 'circle' }
        });

        // Preview Existing Image
        if(buddyJson.Type == "extension"){
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyJson.uID, "extension") }).then();


        }
        if(buddyJson.Type == "xmpp"){
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyJson.uID, "xmpp") }).then();

            $("#fileUploader").hide();
            $("#AddSomeone_Name").attr("disabled", true);
            $("#AddSomeone_Desc").attr("disabled", true);
            $("#AddSomeone_Mobile").attr("disabled", true);
            $("#AddSomeone_Email").attr("disabled", true);
            $("#AddSomeone_Num1").attr("disabled", true);
            $("#AddSomeone_Num2").attr("disabled", true);
        }
        else if(buddyJson.Type == "contact") {
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyJson.cID, "contact") }).then();
        }
        else if(buddyJson.Type == "group") {
            $("#ImageCanvas").croppie('bind', { url: getPicture(buddyJson.gID, "group") }).then();
        }

        $("#AddSomeone_Subscribe").change(function(){
            if($("#AddSomeone_Subscribe").is(':checked')){
                if($("#AddSomeone_Exten").val() != "" && $("#AddSomeone_SubscribeUser").val() == ""){
                    $("#AddSomeone_SubscribeUser").val($("#AddSomeone_Exten").val());
                }
                $("#RowSubscribe").show();
            } else {
                $("#RowSubscribe").hide();
            }
        });

        // Wire-up File Change
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
function SetStatusWindow(){
    HidePopup();

    var windowHtml = "<div class=UiWindowField>";
    windowHtml += "<div><input type=text id=presence_text class=UiInputText maxlength=128></div>";
    windowHtml += "</div>";
    OpenWindow(windowHtml, lang.set_status, 180, 350, false, false, "OK", function(){
        // ["away", "chat", "dnd", "xa"] => ["Away", "Available", "Busy", "Gone"]

        var presenceStr = "chat"
        var statusStr = $("#presence_text").val();

        localDB.setItem("XmppLastPresence", presenceStr);
        localDB.setItem("XmppLastStatus", statusStr);

        XmppSetMyPresence(presenceStr, statusStr);

        CloseWindow();
    }, "Cancel", function(){
        CloseWindow();
    }, function(){
        $("#presence_text").val(getDbItem("XmppLastStatus", ""));
    });
}

// Init UI
// =======
function InitUi(){

    // Custom Web hook
    if(typeof web_hook_on_before_init !== 'undefined') web_hook_on_before_init(phoneOptions);

    ApplyThemeColor()

    var phone = $("#Phone");
    phone.empty();
    phone.attr("class", "pageContainer");
    phone.css("max-width", UiMaxWidth + "px");

    // Left Section
    var leftSection = $("<div/>");
    leftSection.attr("id", "leftContent");
    leftSection.attr("style", "float:left; height: 100%; width:320px");

    var leftHTML = "<table id=leftContentTable class=leftContentTable style=\"height:100%; width:100%\" cellspacing=0 cellpadding=0>";
    leftHTML += "<tr><td class=streamSection style=\"height: 50px; box-sizing: border-box;\">";
    
    // Profile User
    leftHTML += "<div class=profileContainer>";

    // Picture, Caller ID and settings Menu
    leftHTML += "<div class=contact id=UserProfile style=\"cursor: default; margin-bottom:5px;\">";
    // Voicemail Count
    leftHTML += "<span id=TxtVoiceMessages class=voiceMessageNotifyer>0</span>"
    leftHTML += "<div id=UserProfilePic class=buddyIcon></div>";

    // Action Buttons
    leftHTML += "<span class=settingsMenu>";
    leftHTML += "<button class=roundButtons id=BtnFreeDial><i class=\"fa fa-phone\"></i></button>";
    leftHTML += "<button class=roundButtons id=BtnAddSomeone><i class=\"fa fa-user-plus\"></i></button>";
    if(false){
         // TODO
        leftHTML += "<button id=BtnCreateGroup><i class=\"fa fa-users\"></i><i class=\"fa fa-plus\" style=\"font-size:9px\"></i></button>";
    }
    leftHTML += "<button class=roundButtons id=SettingsMenu><i class=\"fa fa-cogs\"></i></button>";
    leftHTML += "</span>";  // class=settingsMenu

    // Display Name
    leftHTML += "<div class=contactNameText style=\"margin-right: 0px;\">"
    // Status
    leftHTML += "<span id=dereglink class=dotOnline style=\"display:none\"></span>";
    leftHTML += "<span id=WebRtcFailed class=dotFailed style=\"display:none\"></span>";
    leftHTML += "<span id=reglink class=dotOffline></span>";
    // User
    leftHTML += " <span id=UserCallID></span>"
    leftHTML += "</div>"; // class=contactNameText
    leftHTML += "<div class=presenceText><span id=regStatus>&nbsp;</span> <span id=dndStatus></span></div>";
    leftHTML += "</div>";  //id=UserProfile

    leftHTML += "</div>"; //  class=profileContainer

    leftHTML += "</td></tr>";
    leftHTML += "<tr id=searchArea><td class=streamSection style=\"height: 35px; box-sizing: border-box; padding-top: 3px; padding-bottom: 0px;\">";

    // Search
    leftHTML += "<span id=divFindBuddy class=searchClean><INPUT id=txtFindBuddy type=text autocomplete=none style=\"width: calc(100% - 78px);\"></span>";
    leftHTML += "<button class=roundButtons id=BtnFilter style=\"margin-left:5px\"><i class=\"fa fa-sliders\"></i></button>"

    leftHTML += "</td></tr>";
    leftHTML += "<tr><td class=streamSection>"

    // Lines & Buddies
    leftHTML += "<div id=myContacts class=\"contactArea cleanScroller\"></div>"
    leftHTML += "<div id=actionArea style=\"display:none\" class=\"contactArea cleanScroller\"></div>"
    
    leftHTML += "</td></tr>";
    leftHTML += "</table>";

    leftSection.html(leftHTML);
    
    // Right Section
    var rightSection = $("<div/>");
    rightSection.attr("id", "rightContent");
    rightSection.attr("class", "rightContent");
    rightSection.attr("style", "margin-left: 320px; height: 100%");

    phone.append(leftSection);
    phone.append(rightSection);

    if(DisableFreeDial == true) {
        $("#BtnFreeDial").hide();
    }
    if(DisableBuddies == true) {
        $("#BtnAddSomeone").hide();
    }
    
    // TODO: 
    $("#BtnCreateGroup").hide(); // Not ready for this yet

    var profilePrepend = "";
    var profileVcard = getDbItem("profileVcard", null);
    if(profileVcard != null) {
        profileVcard = JSON.parse(profileVcard);
        var displayPrefix = getDbItem("ProfileDisplayPrefix", "");
        var displayPrefixSep = getDbItem("ProfileDisplayPrefixSeparator", "-");
        if(displayPrefix != ""){
            try{
                var vCardValue = profileVcard[displayPrefix];
                if(vCardValue && vCardValue != ""){
                    profilePrepend  =  vCardValue + " "+ displayPrefixSep +" "
                }
            }
            catch(e){}
        }
    }
    if(profileName) $("#UserCallID").html(profilePrepend +""+ profileName);
    $("#UserProfilePic").css("background-image", "url('"+ getPicture("profilePicture") +"')");
    
    $("#BtnFilter").attr("title", lang.filter_and_sort)
    $("#BtnFilter").on('click', function(event){
        if(UiCustomSortAndFilterButton == true){
            if(typeof web_hook_sort_and_filter !== 'undefined') {
                web_hook_sort_and_filter(event);
            }
        } else {
            ShowSortAnfFilter();
        }
    });
    
    $("#txtFindBuddy").attr("placeholder", lang.find_someone)
    $("#txtFindBuddy").on('keyup', function(event){
        UpdateBuddyList();
        $("#txtFindBuddy").focus();
    });

    $("#BtnFreeDial").attr("title", lang.call)
    $("#BtnFreeDial").on('click', function(event){
        if(DisableFreeDial == true) return;

        if(UiCustomDialButton == true){
            if(typeof web_hook_dial_out !== 'undefined') {
                web_hook_dial_out(event);
            }
        } else {
            ShowDial();
        }
    });

    $("#BtnAddSomeone").attr("title", lang.add_someone)
    $("#BtnAddSomeone").on('click', function(event){
        if(UiCustomAddBuddy == true){
            if(typeof web_hook_on_add_buddy !== 'undefined') {
                web_hook_on_add_buddy(event);
            }
        } else {
            AddSomeoneWindow();
        }
    });

    $("#TxtVoiceMessages").on('click', function(event){
        if(VoicemailDid != ""){
            DialByLine("audio", null, VoicemailDid, lang.voice_mail);
        }
    });

    $("#BtnCreateGroup").attr("title", lang.create_group)
    $("#BtnCreateGroup").on('click', function(event){
        CreateGroupWindow();
    });

    $("#SettingsMenu").attr("title", lang.configure_extension)
    $("#SettingsMenu").on('click', function(event){
        if(UiCustomConfigMenu == true){
            if(typeof web_hook_on_config_menu !== 'undefined') {
                web_hook_on_config_menu(event);
            }
        } else {
            ShowMyProfileMenu(this);
        }
    });

    // Register Buttons
    $("#reglink").on('click', Register);
    $("#dereglink").on('click', Unregister);

    // WebRTC Error Page
    $("#WebRtcFailed").on('click', function(){
        Confirm(lang.error_connecting_web_socket, lang.web_socket_error, function(){
            window.open("https://"+ wssServer +":"+ WebSocketPort +"/httpstatus");
        }, null);
    });

    // Take out loading UI
    $(".loading").remove();

    UpdateUI();

    // Show Welcome Screen
    if(welcomeScreen){
        if(localDB.getItem("WelcomeScreenAccept") != "yes"){
            OpenWindow(welcomeScreen, lang.welcome, 480, 600, true, false, lang.accept, function(){
                localDB.setItem("WelcomeScreenAccept", "yes");
                CloseWindow();
                ShowMyProfile();
            }, null, null, null, null);

            return;
        }
    }

    // Check if you account is created
    if(profileUserID == null ){
        ShowMyProfile();
        return; // Don't load any more, after applying settings, the page must reload.
    }

    PopulateBuddyList();

    // Select Last user
    if(localDB.getItem("SelectedBuddy") != null){
        console.log("Selecting previously selected buddy...", localDB.getItem("SelectedBuddy"));
        SelectBuddy(localDB.getItem("SelectedBuddy"));
        UpdateUI();
    }

    PreloadAudioFiles();

    // Custom Web hook
    if(typeof web_hook_on_init !== 'undefined') web_hook_on_init();

    CreateUserAgent();
}
function ShowMyProfileMenu(obj){
    var enabledHtml = " <i class=\"fa fa-check\" style=\"float: right; line-height: 18px;\"></i>";

    var items = [];
    items.push({ icon: "fa fa-refresh", text: lang.refresh_registration, value: 1});
    items.push({ icon: "fa fa-wrench", text: lang.configure_extension, value: 2});
    items.push({ icon: null, text: "-" });
    items.push({ icon: "fa fa-user-plus", text: lang.add_someone, value: 3});
    // items.push({ icon: "fa fa-users", text: lang.create_group, value: 4}); // TODO
    items.push({ icon : null, text: "-" });
    if(AutoAnswerEnabled == true){
        items.push({ icon: "fa fa-phone", text: lang.auto_answer + enabledHtml, value: 5});
    }
    else {
        items.push({ icon: "fa fa-phone", text: lang.auto_answer, value: 5});
    }
    if(DoNotDisturbEnabled == true){
        items.push({ icon: "fa fa-ban", text: lang.do_no_disturb + enabledHtml, value: 6});
    }
    else {
        items.push({ icon: "fa fa-ban", text: lang.do_no_disturb, value: 6});
    }
    if(CallWaitingEnabled == true){
        items.push({ icon: "fa fa-volume-control-phone", text: lang.call_waiting + enabledHtml, value: 7});
    }
    else {
        items.push({ icon: "fa fa-volume-control-phone", text: lang.call_waiting, value: 7});
    }
    if(RecordAllCalls == true){
        items.push({ icon: "fa fa-dot-circle-o", text: lang.record_all_calls + enabledHtml, value: 8});
    }
    else {
        items.push({ icon: "fa fa-dot-circle-o", text: lang.record_all_calls, value: 8});
    }
    
    if(ChatEngine == "XMPP") {
        items.push({ icon: null, text: "-" })
        items.push({ icon: "fa fa-comments", text: lang.set_status, value: 9});
    }

    var menu = {
        selectEvent : function( event, ui ) {
            var id = ui.item.attr("value");
            HidePopup();
            if(id == "1") {
                RefreshRegistration();
            }
            if(id == "2") {
                ShowMyProfile();
            }
            if(id == "3") {
                AddSomeoneWindow();
            }
            if(id == "4") {
                CreateGroupWindow(); // TODO
            }
            if(id == "5") {
                ToggleAutoAnswer();
            }
            if(id == "6") {
                ToggleDoNoDisturb();
            }
            if(id == "7") {
                ToggleCallWaiting();
            }
            if(id == "8") {
                ToggleRecordAllCalls();
            }
            if(id == "9") {
                SetStatusWindow();
            }

        },
        createEvent : null,
        autoFocus : true,
        items : items
    }
    PopupMenu(obj, menu);
}
function ApplyThemeColor(){
    //UiThemeStyle = light | dark | system (can change at any time)
    var cssUrl = hostingPrefix +"phone.light.css";
    var wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperLight;

    // Overall Theme
    if(UiThemeStyle == "system"){
        if(window.matchMedia){
            if(window.matchMedia('(prefers-color-scheme: dark)').matches){
                cssUrl = hostingPrefix +"phone.dark.css";
                wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperDark;
            } else {
                cssUrl = hostingPrefix +"phone.light.css";
                wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperLight;
            }
        } else {
            cssUrl = hostingPrefix +"phone.dark.css";
        }
    } else if(UiThemeStyle == "light"){
        cssUrl = hostingPrefix +"phone.light.css";
        wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperLight;
    } else if(UiThemeStyle == "dark") {
        cssUrl = hostingPrefix +"phone.dark.css";
        wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperDark;
    } else {
        // Defaults to light
        cssUrl = hostingPrefix +"phone.light.css";
        wallpaperUrl = hostingPrefix +""+ imagesDirectory +""+ wallpaperLight;
    }
    if($("#colorSchemeMode").length){
        // Style Sheet Added
    } else {
        $("head").append('<link rel="stylesheet" id="colorSchemeMode" />');
    }
    $("#colorSchemeMode").attr("href", cssUrl);

    // Wallpaper
    if($("#colorSchemeModeSheet").length){
        $("#colorSchemeModeSheet").empty();
    } else {
        $("head").append("<style id='colorSchemeModeSheet'></style>");
    }
    var wallpaperStyle = ".wallpaperBackground { background-image:url('"+ wallpaperUrl +"') }";
    $("#colorSchemeModeSheet").text(wallpaperStyle);
}

function PreloadAudioFiles(){
    audioBlobs.Alert = { file : "Alert.mp3", url : hostingPrefix +"media/Alert.mp3" }
    audioBlobs.Ringtone = { file : "Ringtone_1.mp3", url : hostingPrefix +"media/Ringtone_1.mp3" }
    audioBlobs.speech_orig = { file : "speech_orig.mp3", url : hostingPrefix +"media/speech_orig.mp3" }
    audioBlobs.Busy_UK = { file : "Tone_Busy-UK.mp3", url : hostingPrefix +"media/Tone_Busy-UK.mp3" }
    audioBlobs.Busy_US = { file : "Tone_Busy-US.mp3", url : hostingPrefix +"media/Tone_Busy-US.mp3" }
    audioBlobs.CallWaiting = { file : "Tone_CallWaiting.mp3", url : hostingPrefix +"media/Tone_CallWaiting.mp3" }
    audioBlobs.Congestion_UK = { file : "Tone_Congestion-UK.mp3", url : hostingPrefix +"media/Tone_Congestion-UK.mp3" }
    audioBlobs.Congestion_US = { file : "Tone_Congestion-US.mp3", url : hostingPrefix +"media/Tone_Congestion-US.mp3" }
    audioBlobs.EarlyMedia_Australia = { file : "Tone_EarlyMedia-Australia.mp3", url : hostingPrefix +"media/Tone_EarlyMedia-Australia.mp3" }
    audioBlobs.EarlyMedia_European = { file : "Tone_EarlyMedia-European.mp3", url : hostingPrefix +"media/Tone_EarlyMedia-European.mp3" }
    audioBlobs.EarlyMedia_Japan = { file : "Tone_EarlyMedia-Japan.mp3", url : hostingPrefix +"media/Tone_EarlyMedia-Japan.mp3" }
    audioBlobs.EarlyMedia_UK = { file : "Tone_EarlyMedia-UK.mp3", url : hostingPrefix +"media/Tone_EarlyMedia-UK.mp3" }
    audioBlobs.EarlyMedia_US = { file : "Tone_EarlyMedia-US.mp3", url : hostingPrefix +"media/Tone_EarlyMedia-US.mp3" }
    
    $.each(audioBlobs, function (i, item) {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", item.url, true);
        oReq.responseType = "blob";
        oReq.onload = function(oEvent) {
            var reader = new FileReader();
            reader.readAsDataURL(oReq.response);
            reader.onload = function() {
                item.blob = reader.result;
            }
        }
        oReq.send();
    });
    // console.log(audioBlobs);
}

// Create User Agent
// =================
function CreateUserAgent() {
    console.log("Creating User Agent...");
    if(SipDomain==null || SipDomain=="" || SipDomain=="null" || SipDomain=="undefined") SipDomain = wssServer; // Sets globally
    var options = {
        logConfiguration: false,            // If true, constructor logs the registerer configuration.
        uri: SIP.UserAgent.makeURI("sip:"+ SipUsername + "@" + SipDomain),
        transportOptions: {
            server: "wss://"+ wssServer +":"+ WebSocketPort +""+ ServerPath,
            traceSip: false,
            connectionTimeout: TransportConnectionTimeout
            // keepAliveInterval: 30 // Uncomment this and make this any number greater then 0 for keep alive... 
            // NB, adding a keep alive will NOT fix bad internet, if your connection cannot stay open (permanent WebSocket Connection) you probably 
            // have a router or ISP issue, and if your internet is so poor that you need to some how keep it alive with empty packets
            // upgrade you internet connection. This is voip we are talking about here.
        },
        sessionDescriptionHandlerFactoryOptions: {
            peerConnectionConfiguration :{
                bundlePolicy: BundlePolicy,
                // certificates: undefined,
                // iceCandidatePoolSize: 10,
                // iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                // iceTransportPolicy: "all",
                // peerIdentity: undefined,
                // rtcpMuxPolicy: "require",
            },
            iceGatheringTimeout: IceStunCheckTimeout
        },
        contactName: ContactUserName,
        displayName: profileName,
        authorizationUsername: SipUsername,
        authorizationPassword: SipPassword,
        hackIpInContact: IpInContact,           // Asterisk should also be set to rewrite contact
        userAgentString: userAgentStr,
        autoStart: false,
        autoStop: true,
        register: false,
        noAnswerTimeout: NoAnswerTimeout,
        // sipExtension100rel: // UNSUPPORTED | SUPPORTED | REQUIRED NOTE: rel100 is not supported
        contactParams: {},
        delegate: {
            onInvite: function (sip){
                ReceiveCall(sip);
            },
            onMessage: function (sip){
                ReceiveOutOfDialogMessage(sip);
            }
        }
    }
    if(IceStunServerJson != ""){
        options.sessionDescriptionHandlerFactoryOptions.peerConnectionConfiguration.iceServers = JSON.parse(IceStunServerJson);
    }

    // Added to the contact BEFORE the '>' (permanent)
    if(RegisterContactParams && RegisterContactParams != "" && RegisterContactParams != "{}"){
        try{
            options.contactParams = JSON.parse(RegisterContactParams);
        } catch(e){}
    }
    if(WssInTransport){
        try{
            options.contactParams.transport = "wss";
        } catch(e){}
    }

    // Add (Hardcode) other RTCPeerConnection({ rtcConfiguration }) config dictionary options here
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection
    // Example: 
    // options.sessionDescriptionHandlerFactoryOptions.peerConnectionConfiguration.rtcpMuxPolicy = "require";
    
    userAgent = new SIP.UserAgent(options);
    userAgent.isRegistered = function(){
        return (userAgent && userAgent.registerer && userAgent.registerer.state == SIP.RegistererState.Registered);
    }
    // For some reason this is marked as private... not sure why
    userAgent.sessions = userAgent._sessions;
    userAgent.registrationCompleted = false;
    userAgent.registering = false;
    userAgent.transport.ReconnectionAttempts = TransportReconnectionAttempts;
    userAgent.transport.attemptingReconnection = false;
    userAgent.BlfSubs = [];
    userAgent.lastVoicemailCount = 0;

    console.log("Creating User Agent... Done");
    // Custom Web hook
    if(typeof web_hook_on_userAgent_created !== 'undefined') web_hook_on_userAgent_created(userAgent);

    userAgent.transport.onConnect = function(){
        onTransportConnected();
    }
    userAgent.transport.onDisconnect = function(error){
        if(error){
            onTransportConnectError(error);
        }
        else {
            onTransportDisconnected();
        }
    }

    var RegistererOptions = { 
        logConfiguration: false,            // If true, constructor logs the registerer configuration.
        expires: RegisterExpires,
        extraHeaders: [],
        extraContactHeaderParams: [],
        refreshFrequency : 75              // Determines when a re-REGISTER request is sent. The value should be specified as a percentage of the expiration time (between 50 and 99).
    }

    // Added to the SIP Headers
    if(RegisterExtraHeaders && RegisterExtraHeaders != "" && RegisterExtraHeaders != "{}"){
        try{
            var registerExtraHeaders = JSON.parse(RegisterExtraHeaders);
            for (const [key, value] of Object.entries(registerExtraHeaders)) {
                if(value != ""){
                    RegistererOptions.extraHeaders.push(key + ": "+  value);
                }
            }
        } catch(e){}
    }

    // Added to the contact AFTER the '>' (not permanent)
    if(RegisterExtraContactParams && RegisterExtraContactParams != "" && RegisterExtraContactParams != "{}"){
        try{
            var registerExtraContactParams = JSON.parse(RegisterExtraContactParams);
            for (const [key, value] of Object.entries(registerExtraContactParams)) {
                if(value == ""){
                    RegistererOptions.extraContactHeaderParams.push(key);
                } else {
                    RegistererOptions.extraContactHeaderParams.push(key + "="+  value);
                }
            }
        } catch(e){}
    }

    userAgent.registerer = new SIP.Registerer(userAgent, RegistererOptions);
    console.log("Creating Registerer... Done");

    userAgent.registerer.stateChange.addListener(function(newState){
        console.log("User Agent Registration State:", newState);
        switch (newState) {
            case SIP.RegistererState.Initial:
                // Nothing to do
                break;
            case SIP.RegistererState.Registered:
                onRegistered();
                break;
            case SIP.RegistererState.Unregistered:
                onUnregistered();
                break;
            case SIP.RegistererState.Terminated:
                // Nothing to do
                break;
        }
    });

    console.log("User Agent Connecting to WebSocket...");
    $("#regStatus").html(lang.connecting_to_web_socket);
    userAgent.start().catch(function(error){
        onTransportConnectError(error);
    });

}

// Transport Events
// ================
function onTransportConnected(){
    console.log("Connected to Web Socket!");
    $("#regStatus").html(lang.connected_to_web_socket);

    $("#WebRtcFailed").hide();

    // Reset the ReconnectionAttempts
    userAgent.isReRegister = false;
    userAgent.transport.attemptingReconnection = false;
    userAgent.transport.ReconnectionAttempts = TransportReconnectionAttempts;

    // Auto start register
    if(userAgent.transport.attemptingReconnection == false && userAgent.registering == false){
        window.setTimeout(function (){
            Register();
        }, 500);
    } else{
        console.warn("onTransportConnected: Register() called, but attemptingReconnection is true or registering is true")
    }
}
function onTransportConnectError(error){
    console.warn("WebSocket Connection Failed:", error);

    // We set this flag here so that the re-register attempts are fully completed.
    userAgent.isReRegister = false;

    // If there is an issue with the WS connection
    // We unregister, so that we register again once its up
    console.log("Unregister...");
    try{
        userAgent.registerer.unregister();
    } catch(e){
        // I know!!!
    }

    $("#regStatus").html(lang.web_socket_error);
    $("#WebRtcFailed").show();

    ReconnectTransport();

    // Custom Web hook
    if(typeof web_hook_on_transportError !== 'undefined') web_hook_on_transportError(userAgent.transport, userAgent);
}
function onTransportDisconnected(){
    console.log("Disconnected from Web Socket!");
    $("#regStatus").html(lang.disconnected_from_web_socket);

    userAgent.isReRegister = false;
}
function ReconnectTransport(){
    if(userAgent == null) return;

    userAgent.registering = false; // if the transport was down, you will not be registered
    if(userAgent.transport && userAgent.transport.isConnected()){
        // Asked to re-connect, but ws is connected
        onTransportConnected();
        return;
    }
    console.log("Reconnect Transport...");

    window.setTimeout(function(){
        $("#regStatus").html(lang.connecting_to_web_socket);
        console.log("ReConnecting to WebSocket...");

        if(userAgent.transport && userAgent.transport.isConnected()){
            // Already Connected
            onTransportConnected();
            return;
        } else {
            userAgent.transport.attemptingReconnection = true
            userAgent.reconnect().catch(function(error){
                userAgent.transport.attemptingReconnection = false
                console.warn("Failed to reconnect", error);

                // Try Again
                ReconnectTransport();
            });
        }
    }, TransportReconnectionTimeout * 1000);

    $("#regStatus").html(lang.connecting_to_web_socket);
    console.log("Waiting to Re-connect...", TransportReconnectionTimeout, "Attempt remaining", userAgent.transport.ReconnectionAttempts);
    userAgent.transport.ReconnectionAttempts = userAgent.transport.ReconnectionAttempts - 1;
}

// Registration
// ============
function Register() {
    if (userAgent == null) return;
    if (userAgent.registering == true) return;
    if (userAgent.isRegistered()) return;

    var RegistererRegisterOptions = {
        requestDelegate: {
            onReject: function(sip){
                onRegisterFailed(sip.message.reasonPhrase, sip.message.statusCode);
            }
        }
    }

    console.log("Sending Registration...");
    $("#regStatus").html(lang.sending_registration);
    userAgent.registering = true
    userAgent.registerer.register(RegistererRegisterOptions);
}
function Unregister(skipUnsubscribe) {
    if (userAgent == null || !userAgent.isRegistered()) return;

    if(skipUnsubscribe == true){
        console.log("Skipping Unsubscribe");
    } else {
        console.log("Unsubscribing...");
        $("#regStatus").html(lang.unsubscribing);
        try {
            UnsubscribeAll();
        } catch (e) { }
    }

    console.log("Unregister...");
    $("#regStatus").html(lang.disconnecting);
    userAgent.registerer.unregister();

    userAgent.transport.attemptingReconnection = false;
    userAgent.registering = false;
    userAgent.isReRegister = false;
}

// Registration Events
// ===================
/**
 * Called when account is registered
 */
function onRegistered(){
    // This code fires on re-register after session timeout
    // to ensure that events are not fired multiple times
    // a isReRegister state is kept.
    // TODO: This check appears obsolete

    userAgent.registrationCompleted = true;
    if(!userAgent.isReRegister) {
        console.log("Registered!");

        $("#reglink").hide();
        $("#dereglink").show();
        if(DoNotDisturbEnabled || DoNotDisturbPolicy == "enabled") {
            $("#dereglink").attr("class", "dotDoNotDisturb");
            $("#dndStatus").html("(DND)");
        }

        // Start Subscribe Loop
        window.setTimeout(function (){
            SubscribeAll();
        }, 500);

        // Output to status
        $("#regStatus").html(lang.registered);

        // Start XMPP
        if(ChatEngine == "XMPP") reconnectXmpp();

        userAgent.registering = false;

        // Close possible Alerts that may be open. (Can be from failed registers)
        if (alertObj != null) {
            alertObj.dialog("close");
            alertObj = null;
        }

        // Custom Web hook
        if(typeof web_hook_on_register !== 'undefined') web_hook_on_register(userAgent);
    }
    else {
        userAgent.registering = false;

        console.log("ReRegistered!");
    }
    userAgent.isReRegister = true;
}
/**
 * Called if UserAgent can connect, but not register.
 * @param {string} response Incoming request message
 * @param {string} cause Cause message. Unused
**/
function onRegisterFailed(response, cause){
    console.log("Registration Failed: " + response);
    $("#regStatus").html(lang.registration_failed);

    $("#reglink").show();
    $("#dereglink").hide();

    Alert(lang.registration_failed +":"+ response, lang.registration_failed);

    userAgent.registering = false;

    // Custom Web hook
    if(typeof web_hook_on_registrationFailed !== 'undefined') web_hook_on_registrationFailed(response);
}
/**
 * Called when Unregister is requested
 */
function onUnregistered(){
    if(userAgent.registrationCompleted){
        console.log("Unregistered, bye!");
        $("#regStatus").html(lang.unregistered);

        $("#reglink").show();
        $("#dereglink").hide();

        // Custom Web hook
        if(typeof web_hook_on_unregistered !== 'undefined') web_hook_on_unregistered();
    }
    else {
        // Was never really registered, so cant really say unregistered
    }

    // We set this flag here so that the re-register attempts are fully completed.
    userAgent.isReRegister = false;
}

// Inbound Calls
// =============
function ReceiveCall(session) {
    // First Determine Identity from From
    var callerID = session.remoteIdentity.displayName;
    var did = session.remoteIdentity.uri.user;
    if (typeof callerID === 'undefined') callerID = did;

    var sipHeaders = session.incomingInviteRequest.message.headers;
    // If a P-Asserted-Identity is parsed, use that
    if(sipHeaders.hasOwnProperty("P-Asserted-Identity")){
        var rawUri = sipHeaders["P-Asserted-Identity"][0].raw;
        if(rawUri.includes("<sip:")) {
            var uriParts = rawUri.split("<sip:");
            if(uriParts[1].endsWith(">")) uriParts[1] = uriParts[1].substring(0, uriParts[1].length -1);
            if(uriParts[1].endsWith("@"+SipDomain)){
                var assertId = SIP.UserAgent.makeURI("sip:"+ uriParts[1]); // should be sip:123@domain.com
                did = assertId.user;
                console.log("Found P-Asserted-Identity, will use that to identify user:", did);
            }
            else {
                console.warn("Found P-Asserted-Identity but not in trust domain: ", rawUri);
            }
        }
        else {
            console.warn("Found P-Asserted-Identity but not in a URI: ", rawUri);
        }
    }

    console.log("New Incoming Call!", callerID +" <"+ did +">");

    var CurrentCalls = countSessions(session.id);
    console.log("Current Call Count:", CurrentCalls);

    var buddyObj = FindBuddyByDid(did);
    // Make new contact of its not there
    if(buddyObj == null) {

        var focusOnBuddy = (CurrentCalls==0);
        
        // Check for Hints in Headers
        // Buddy Create Hints: Parse any of the following Sip Headers to help create a buddy
        // Note: SIP.js will make the header names Lowercase
        var buddyType = (did.length > DidLength)? "contact" : "extension";
        // X-Buddytype: xmpp
        if(sipHeaders.hasOwnProperty("X-Buddytype")){
            if(sipHeaders["X-Buddytype"][0].raw == "contact" || sipHeaders["X-Buddytype"][0].raw == "extension" || sipHeaders["X-Buddytype"][0].raw == "xmpp" || sipHeaders["X-Buddytype"][0].raw == "group"){
                buddyType = sipHeaders["X-Buddytype"][0].raw;
                console.log("Hint Header X-Buddytype:", buddyType)
            }
            else {
                console.warn("Hint Header X-Buddytype must either contact | extension | xmpp | group: ", sipHeaders["X-Buddytype"][0].raw);
            }
        }
        var xmppJid = null;
        // X-Xmppjid: bob@somedomain.com
        if(buddyType == "xmpp"){
            if(sipHeaders.hasOwnProperty("X-Xmppjid")){
                if(sipHeaders["X-Xmppjid"][0].raw.endsWith("@"+XmppDomain)){
                    xmppJid = sipHeaders["X-Xmppjid"][0].raw;
                    console.log("Hint Header X-Xmppjid:", xmppJid)
                }
            }
            else {
                console.warn("Hint Header X-Xmppjid must end with @XmppDomain", sipHeaders["X-Xmppjid"][0].raw);
            }
        }
        // X-Subscribeuser: sip:1000@somedomain.com
        var subscribeToBuddy = false;
        var subscribeUser = null;
        if(sipHeaders.hasOwnProperty("X-Subscribeuser")){
            if(sipHeaders["X-Subscribeuser"][0].raw.startsWith("sip:") && sipHeaders["X-Subscribeuser"][0].raw.endsWith("@"+SipDomain)){
                subscribeUser = sipHeaders["X-Subscribeuser"][0].raw.substring(4, sipHeaders["X-Subscribeuser"][0].raw.indexOf("@"));
                subscribeToBuddy = true;
                console.log("Hint Header X-Subscribeuser:", subscribeUser)
            }
            else {
                console.warn("Hint Header X-Subscribeuser must start with sip: and end with @SipDomain", sipHeaders["X-Subscribeuser"][0].raw);
            }
        }
        var allowDuringDnd = false;
        // X-Allowduringdnd: yes
        if(sipHeaders.hasOwnProperty("X-Allowduringdnd")){
            if(sipHeaders["X-Allowduringdnd"][0].raw == "yes" || sipHeaders["X-Allowduringdnd"][0].raw == "no"){
                allowDuringDnd = (sipHeaders["X-Allowduringdnd"][0].raw == "yes");
                console.log("Hint Header X-Allowduringdnd:", allowDuringDnd)
            }
            else {
                console.warn("Hint Header X-Allowduringdnd must yes | no :", sipHeaders["X-Allowduringdnd"][0].raw);
            }
        }
        var autoDelete = AutoDeleteDefault;
        // X-Autodelete: yes
        if(sipHeaders.hasOwnProperty("X-Autodelete")){
            if(sipHeaders["X-Autodelete"][0].raw == "yes" || sipHeaders["X-Autodelete"][0].raw == "no"){
                autoDelete = (sipHeaders["X-Autodelete"][0].raw == "yes");
                console.log("Hint Header X-Autodelete:", autoDelete)
            }
            else {
                console.warn("Hint Header X-Autodelete must yes | no :", sipHeaders["X-Autodelete"][0].raw);
            }
        }
        
        buddyObj = MakeBuddy(buddyType, true, focusOnBuddy, subscribeToBuddy, callerID, did, xmppJid, allowDuringDnd, subscribeUser, autoDelete, true);
    }
    else {
        // Double check that the buddy has the same caller ID as the incoming call
        // With Buddies that are contacts, eg +441234567890 <+441234567890> leave as as
        if(buddyObj.type == "extension" && buddyObj.CallerIDName != callerID){
            UpdateBuddyCallerID(buddyObj, callerID);
        }
        else if(buddyObj.type == "contact" && callerID != did && buddyObj.CallerIDName != callerID){
            UpdateBuddyCallerID(buddyObj, callerID);
        }
    }

    var startTime = moment.utc();

    // Create the line and add the session so we can answer or reject it.
    newLineNumber = newLineNumber + 1;
    var lineObj = new Line(newLineNumber, callerID, did, buddyObj);
    lineObj.SipSession = session;
    lineObj.SipSession.data = {}
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.calldirection = "inbound";
    lineObj.SipSession.data.terminateby = "";
    lineObj.SipSession.data.src = did;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    lineObj.SipSession.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    lineObj.SipSession.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime));
        var timeStr = formatShortDuration(duration.asSeconds());
        $("#line-" + lineObj.LineNumber + "-timer").html(timeStr);
        $("#line-" + lineObj.LineNumber + "-datetime").html(timeStr);
    }, 1000);
    lineObj.SipSession.data.earlyReject = false;
    Lines.push(lineObj);
    // Detect Video
    lineObj.SipSession.data.withvideo = false;
    if(EnableVideoCalling == true && lineObj.SipSession.request.body){
        // Asterisk 13 PJ_SIP always sends m=video if endpoint has video codec,
        // even if original invite does not specify video.
        if(lineObj.SipSession.request.body.indexOf("m=video") > -1) {
            lineObj.SipSession.data.withvideo = true;
            // The invite may have video, but the buddy may be a contact
            if(buddyObj.type == "contact"){
                // videoInvite = false;
                // TODO: Is this limitation necessary?
            }
        }
    }

    // Session Delegates
    lineObj.SipSession.delegate = {
        onBye: function(sip){
            onSessionReceivedBye(lineObj, sip)
        },
        onMessage: function(sip){
            onSessionReceivedMessage(lineObj, sip);
        },
        onInvite: function(sip){
            onSessionReinvited(lineObj, sip);
        },
        onSessionDescriptionHandler: function(sdh, provisional){
            onSessionDescriptionHandlerCreated(lineObj, sdh, provisional, lineObj.SipSession.data.withvideo);
        }
    }
    // incomingInviteRequestDelegate
    lineObj.SipSession.incomingInviteRequest.delegate = {
        onCancel: function(sip){
            onInviteCancel(lineObj, sip)
        }
    }

    // Possible Early Rejection options
    if(DoNotDisturbEnabled == true || DoNotDisturbPolicy == "enabled") {
        if(DoNotDisturbEnabled == true && buddyObj.EnableDuringDnd == true){
            // This buddy has been allowed 
            console.log("Buddy is allowed to call while you are on DND")
        }
        else {
            console.log("Do Not Disturb Enabled, rejecting call.");
            lineObj.SipSession.data.earlyReject = true;
            RejectCall(lineObj.LineNumber, true);
            return;
        }
    }
    if(CurrentCalls >= 1){
        if(CallWaitingEnabled == false || CallWaitingEnabled == "disabled"){
            console.log("Call Waiting Disabled, rejecting call.");
            lineObj.SipSession.data.earlyReject = true;
            RejectCall(lineObj.LineNumber, true);
            return;
        }
    }

    // Create the call HTML 
    AddLineHtml(lineObj, "inbound");
    $("#line-" + lineObj.LineNumber + "-msg").html(lang.incoming_call);
    $("#line-" + lineObj.LineNumber + "-msg").show();
    $("#line-" + lineObj.LineNumber + "-timer").show();
    if(lineObj.SipSession.data.withvideo){
        $("#line-"+ lineObj.LineNumber +"-answer-video").show();
    }
    else {
        $("#line-"+ lineObj.LineNumber +"-answer-video").hide();
    }
    $("#line-" + lineObj.LineNumber + "-AnswerCall").show();

    // Update the buddy list now so that any early rejected calls don't flash on
    UpdateBuddyList();

    // Auto Answer options
    var autoAnswerRequested = false;
    var answerTimeout = 1000;
    if (!AutoAnswerEnabled  && IntercomPolicy == "enabled"){ // Check headers only if policy is allow

        // https://github.com/InnovateAsterisk/Browser-Phone/issues/126
        // Alert-Info: info=alert-autoanswer
        // Alert-Info: answer-after=0
        // Call-info: answer-after=0; x=y
        // Call-Info: Answer-After=0
        // Alert-Info: ;info=alert-autoanswer
        // Alert-Info: <sip:>;info=alert-autoanswer
        // Alert-Info: <sip:domain>;info=alert-autoanswer

        var ci = session.request.headers["Call-Info"];
        if (ci !== undefined && ci.length > 0){
            for (var i = 0; i < ci.length; i++){
                var raw_ci = ci[i].raw.toLowerCase();
                if (raw_ci.indexOf("answer-after=") > 0){
                    var temp_seconds_autoanswer = parseInt(raw_ci.substring(raw_ci.indexOf("answer-after=") +"answer-after=".length).split(';')[0]);
                    if (Number.isInteger(temp_seconds_autoanswer) && temp_seconds_autoanswer >= 0){
                        autoAnswerRequested = true;
                        if(temp_seconds_autoanswer > 1) answerTimeout = temp_seconds_autoanswer * 1000;
                        break;
                    }
                }
            }
        }
        var ai = session.request.headers["Alert-Info"];
        if (autoAnswerRequested === false && ai !== undefined && ai.length > 0){
            for (var i=0; i < ai.length ; i++){
                var raw_ai = ai[i].raw.toLowerCase();
                if (raw_ai.indexOf("auto answer") > 0 || raw_ai.indexOf("alert-autoanswer") > 0){
                    var autoAnswerRequested = true;
                    break;
                }
                if (raw_ai.indexOf("answer-after=") > 0){
                    var temp_seconds_autoanswer = parseInt(raw_ai.substring(raw_ai.indexOf("answer-after=") +"answer-after=".length).split(';')[0]);
                    if (Number.isInteger(temp_seconds_autoanswer) && temp_seconds_autoanswer >= 0){
                        autoAnswerRequested = true;
                        if(temp_seconds_autoanswer > 1) answerTimeout = temp_seconds_autoanswer * 1000;
                        break;
                    }
                }
            }
        }
    }

    if(AutoAnswerEnabled || AutoAnswerPolicy == "enabled" || autoAnswerRequested){
        if(CurrentCalls == 0){ // There are no other calls, so you can answer
            console.log("Going to Auto Answer this call...");
            window.setTimeout(function(){
                // If the call is with video, assume the auto answer is also
                // In order for this to work nicely, the recipient maut be "ready" to accept video calls
                // In order to ensure video call compatibility (i.e. the recipient must have their web cam in, and working)
                // The NULL video should be configured
                // https://github.com/InnovateAsterisk/Browser-Phone/issues/26
                if(lineObj.SipSession.data.withvideo) {
                    AnswerVideoCall(lineObj.LineNumber);
                }
                else {
                    AnswerAudioCall(lineObj.LineNumber);
                }
            }, answerTimeout);

            // Select Buddy
            SelectLine(lineObj.LineNumber);
            return;
        }
        else {
            console.warn("Could not auto answer call, already on a call.");
        }
    }

    // Check if that buddy is not already on a call??
    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
    if (streamVisible || CurrentCalls == 0) {
        // If you are already on the selected buddy who is now calling you, switch to his call.
        // NOTE: This will put other calls on hold
        if(CurrentCalls == 0) SelectLine(lineObj.LineNumber);
    }

    // Show notification / Ring / Windows Etc
    // ======================================

    // Browser Window Notification
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            var noticeOptions = { body: lang.incoming_call_from +" " + callerID +" <"+ did +">", icon: getPicture(buddyObj.identity) }
            var inComingCallNotification = new Notification(lang.incoming_call, noticeOptions);
            inComingCallNotification.onclick = function (event) {

                var lineNo = lineObj.LineNumber;
                var videoInvite = lineObj.SipSession.data.withvideo
                window.setTimeout(function(){
                    // https://github.com/InnovateAsterisk/Browser-Phone/issues/26
                    if(videoInvite) {
                        AnswerVideoCall(lineNo)
                    }
                    else {
                        AnswerAudioCall(lineNo);
                    }
                }, 1000);

                // Select Buddy
                SelectLine(lineNo);
                return;
            }
        }
    }

    // Play Ring Tone if not on the phone
    if(EnableRingtone == true){
        if(CurrentCalls >= 1){
            // Play Alert
            console.log("Audio:", audioBlobs.CallWaiting.url);
            var ringer = new Audio(audioBlobs.CallWaiting.blob);
            ringer.preload = "auto";
            ringer.loop = false;
            ringer.oncanplaythrough = function(e) {
                if (typeof ringer.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                    ringer.setSinkId(getRingerOutputID()).then(function() {
                        console.log("Set sinkId to:", getRingerOutputID());
                    }).catch(function(e){
                        console.warn("Failed not apply setSinkId.", e);
                    });
                }
                // If there has been no interaction with the page at all... this page will not work
                ringer.play().then(function(){
                    // Audio Is Playing
                }).catch(function(e){
                    console.warn("Unable to play audio file.", e);
                }); 
            }
            lineObj.SipSession.data.ringerObj = ringer;
        } else {
            // Play Ring Tone
            console.log("Audio:", audioBlobs.Ringtone.url);
            var ringer = new Audio(audioBlobs.Ringtone.blob);
            ringer.preload = "auto";
            ringer.loop = true;
            ringer.oncanplaythrough = function(e) {
                if (typeof ringer.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                    ringer.setSinkId(getRingerOutputID()).then(function() {
                        console.log("Set sinkId to:", getRingerOutputID());
                    }).catch(function(e){
                        console.warn("Failed not apply setSinkId.", e);
                    });
                }
                // If there has been no interaction with the page at all... this page will not work
                ringer.play().then(function(){
                    // Audio Is Playing
                }).catch(function(e){
                    console.warn("Unable to play audio file.", e);
                }); 
            }
            lineObj.SipSession.data.ringerObj = ringer;
        }
    
    }

    // Custom Web hook
    if(typeof web_hook_on_invite !== 'undefined') web_hook_on_invite(session);
}
function AnswerAudioCall(lineNumber) {
    // CloseWindow();

    var lineObj = FindLineByNumber(lineNumber);
    if(lineObj == null){
        console.warn("Failed to get line ("+ lineNumber +")");
        return;
    }
    var session = lineObj.SipSession;
    // Stop the ringtone
    if(session.data.ringerObj){
        session.data.ringerObj.pause();
        session.data.ringerObj.removeAttribute('src');
        session.data.ringerObj.load();
        session.data.ringerObj = null;
    }
    // Check vitals
    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_failed);
        $("#line-" + lineObj.LineNumber + "-AnswerCall").hide();
        return;
    }

    // Update UI
    $("#line-" + lineObj.LineNumber + "-AnswerCall").hide();

    // Start SIP handling
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: { deviceId : "default" },
                video: false
            }
        }
    }

    // Configure Audio
    var currentAudioDevice = getAudioSrcID();
    if(currentAudioDevice != "default"){
        var confirmedAudioDevice = false;
        for (var i = 0; i < AudioinputDevices.length; ++i) {
            if(currentAudioDevice == AudioinputDevices[i].deviceId) {
                confirmedAudioDevice = true;
                break;
            }
        }
        if(confirmedAudioDevice) {
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: currentAudioDevice }
        }
        else {
            console.warn("The audio device you used before is no longer available, default settings applied.");
            localDB.setItem("AudioSrcId", "default");
        }
    }
    // Add additional Constraints
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Save Devices
    lineObj.SipSession.data.withvideo = false;
    lineObj.SipSession.data.VideoSourceDevice = null;
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();

    // Send Answer
    lineObj.SipSession.accept(spdOptions).then(function(){
        onInviteAccepted(lineObj,false);
    }).catch(function(error){
        console.warn("Failed to answer call", error, lineObj.SipSession);
        lineObj.SipSession.data.reasonCode = 500;
        lineObj.SipSession.data.reasonText = "Client Error";
        teardownSession(lineObj);
    });
}
function AnswerVideoCall(lineNumber) {
    // CloseWindow();

    var lineObj = FindLineByNumber(lineNumber);
    if(lineObj == null){
        console.warn("Failed to get line ("+ lineNumber +")");
        return;
    }
    var session = lineObj.SipSession;
    // Stop the ringtone
    if(session.data.ringerObj){
        session.data.ringerObj.pause();
        session.data.ringerObj.removeAttribute('src');
        session.data.ringerObj.load();
        session.data.ringerObj = null;
    }
    // Check vitals
    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_failed);
        $("#line-" + lineObj.LineNumber + "-AnswerCall").hide();
        return;
    }

    // Update UI
    $("#line-" + lineObj.LineNumber + "-AnswerCall").hide();

    // Start SIP handling
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: { deviceId : "default" },
                video: { deviceId : "default" }
            }
        }
    }

    // Configure Audio
    var currentAudioDevice = getAudioSrcID();
    if(currentAudioDevice != "default"){
        var confirmedAudioDevice = false;
        for (var i = 0; i < AudioinputDevices.length; ++i) {
            if(currentAudioDevice == AudioinputDevices[i].deviceId) {
                confirmedAudioDevice = true;
                break;
            }
        }
        if(confirmedAudioDevice) {
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: currentAudioDevice }
        }
        else {
            console.warn("The audio device you used before is no longer available, default settings applied.");
            localDB.setItem("AudioSrcId", "default");
        }
    }
    // Add additional Constraints
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
    if(currentVideoDevice != "default"){
        var confirmedVideoDevice = false;
        for (var i = 0; i < VideoinputDevices.length; ++i) {
            if(currentVideoDevice == VideoinputDevices[i].deviceId) {
                confirmedVideoDevice = true;
                break;
            }
        }
        if(confirmedVideoDevice){
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = { exact: currentVideoDevice }
        }
        else {
            console.warn("The video device you used before is no longer available, default settings applied.");
            localDB.setItem("VideoSrcId", "default"); // resets for later and subsequent calls
        }
    }
    // Add additional Constraints
    if(supportedConstraints.frameRate && maxFrameRate != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
    }
    if(supportedConstraints.height && videoHeight != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
    }
    if(supportedConstraints.aspectRatio && videoAspectRatio != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
    }

    // Save Devices
    lineObj.SipSession.data.withvideo = true;
    lineObj.SipSession.data.VideoSourceDevice = getVideoSrcID();
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();

    if(StartVideoFullScreen) ExpandVideoArea(lineObj.LineNumber);

    // Send Answer
    lineObj.SipSession.accept(spdOptions).then(function(){
        onInviteAccepted(lineObj,true);
    }).catch(function(error){
        console.warn("Failed to answer call", error, lineObj.SipSession);
        lineObj.SipSession.data.reasonCode = 500;
        lineObj.SipSession.data.reasonText = "Client Error";
        teardownSession(lineObj);
    });
}
function RejectCall(lineNumber) {
    var lineObj = FindLineByNumber(lineNumber);
    if (lineObj == null) {
        console.warn("Unable to find line ("+ lineNumber +")");
        return;
    }
    var session = lineObj.SipSession;
    if (session == null) {
        console.warn("Reject failed, null session");
        $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_failed);
        $("#line-" + lineObj.LineNumber + "-AnswerCall").hide();
    }
    if(session.state == SIP.SessionState.Established){
        session.bye().catch(function(e){
            console.warn("Problem in RejectCall(), could not bye() call", e, session);
        });
    }
    else {
        session.reject({ 
            statusCode: 486, 
            reasonPhrase: "Busy Here" 
        }).catch(function(e){
            console.warn("Problem in RejectCall(), could not reject() call", e, session);
        });
    }
    $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_rejected);

    session.data.terminateby = "us";
    session.data.reasonCode = 486;
    session.data.reasonText = "Busy Here";
    teardownSession(lineObj);
}

// Session Events
// ==============

// Incoming INVITE
function onInviteCancel(lineObj, response){
        // Remote Party Canceled while ringing...

        // Check to see if this call has been completed elsewhere
        // https://github.com/InnovateAsterisk/Browser-Phone/issues/405
        var temp_cause = 0;
        var reason = response.headers["Reason"];
        if (reason !== undefined && reason.length > 0){
            for (var i = 0; i < reason.length; i++){
                var cause = reason[i].raw.toLowerCase().trim(); // Reason: Q.850 ;cause=16 ;text="Terminated"
                var items = cause.split(';');
                if (items.length >= 2 && (items[0].trim() == "sip" || items[0].trim() == "q.850") && items[1].includes("cause") && cause.includes("call completed elsewhere")){
                    temp_cause = parseInt(items[1].substring(items[1].indexOf("=")+1).trim());
                    // No sample provided for "token"
                    break;
                }
            }
        }

        lineObj.SipSession.data.terminateby = "them";
        lineObj.SipSession.data.reasonCode = temp_cause;
        if(temp_cause == 0){
            lineObj.SipSession.data.reasonText = "Call Cancelled";
            console.log("Call canceled by remote party before answer");
        } else {
            lineObj.SipSession.data.reasonText = "Call completed elsewhere";
            console.log("Call completed elsewhere before answer");
        }

        lineObj.SipSession.dispose().catch(function(error){
            console.log("Failed to dispose the cancel dialog", error);
        })

        teardownSession(lineObj);
}
// Both Incoming an outgoing INVITE
function onInviteAccepted(lineObj, includeVideo, response){
    // Call in progress
    var session = lineObj.SipSession;

    if(session.data.earlyMedia){
        session.data.earlyMedia.pause();
        session.data.earlyMedia.removeAttribute('src');
        session.data.earlyMedia.load();
        session.data.earlyMedia = null;
    }

    window.clearInterval(session.data.callTimer);
    $("#line-" + lineObj.LineNumber + "-timer").show();
    var startTime = moment.utc();
    session.data.startTime = startTime;
    session.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime));
        var timeStr = formatShortDuration(duration.asSeconds());
        $("#line-" + lineObj.LineNumber + "-timer").html(timeStr);
        $("#line-" + lineObj.LineNumber + "-datetime").html(timeStr);
    }, 1000);
    session.isOnHold = false;
    session.data.started = true;

    if(includeVideo){
        // Preview our stream from peer connection
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

        // Apply Call Bandwidth Limits
        if(MaxVideoBandwidth > -1){
            pc.getSenders().forEach(function (sender) {
                if(sender.track && sender.track.kind == "video"){

                    var parameters = sender.getParameters();
                    if(!parameters.encodings) parameters.encodings = [{}];
                    parameters.encodings[0].maxBitrate = MaxVideoBandwidth * 1000;

                    console.log("Applying limit for Bandwidth to: ", MaxVideoBandwidth + "kb per second")

                    // Only going to try without re-negotiations
                    sender.setParameters(parameters).catch(function(e){
                        console.warn("Cannot apply Bandwidth Limits", e);
                    });

                }
            });
        }

    }

    // Start Call Recording
    if(RecordAllCalls || CallRecordingPolicy == "enabled") {
        StartRecording(lineObj.LineNumber);
    }

    if(includeVideo){
        // Layout for Video Call
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
    }
    else {
        // Layout for Audio Call
        $("#line-" + lineObj.LineNumber + "-progress").hide();
        $("#line-" + lineObj.LineNumber + "-VideoCall").hide();
        $("#line-" + lineObj.LineNumber + "-AudioCall").show();
        // Call Control
        $("#line-"+ lineObj.LineNumber +"-btn-Mute").show();
        $("#line-"+ lineObj.LineNumber +"-btn-Unmute").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-start-recording").show();
        $("#line-"+ lineObj.LineNumber +"-btn-stop-recording").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-Hold").show();
        $("#line-"+ lineObj.LineNumber +"-btn-Unhold").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-Transfer").show();
        $("#line-"+ lineObj.LineNumber +"-btn-CancelTransfer").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-Conference").show();
        $("#line-"+ lineObj.LineNumber +"-btn-CancelConference").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-ShowDtmf").show();
        $("#line-"+ lineObj.LineNumber +"-btn-settings").show();
        $("#line-"+ lineObj.LineNumber +"-btn-ShowCallStats").show();
        $("#line-"+ lineObj.LineNumber +"-btn-HideCallStats").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-ShowTimeline").show();
        $("#line-"+ lineObj.LineNumber +"-btn-HideTimeline").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-present-src").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-expand").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-restore").hide();
        $("#line-"+ lineObj.LineNumber +"-btn-End").show();
        // Show the Call
        $("#line-" + lineObj.LineNumber + "-ActiveCall").show();
    }

    UpdateBuddyList()
    updateLineScroll(lineObj.LineNumber);

    // Start Audio Monitoring
    lineObj.LocalSoundMeter = StartLocalAudioMediaMonitoring(lineObj.LineNumber, session);
    lineObj.RemoteSoundMeter = StartRemoteAudioMediaMonitoring(lineObj.LineNumber, session);

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_in_progress);

    if(includeVideo && StartVideoFullScreen) ExpandVideoArea(lineObj.LineNumber);

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("accepted", session);
}
// Outgoing INVITE
function onInviteTrying(lineObj, response){
    $("#line-" + lineObj.LineNumber + "-msg").html(lang.trying);

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("trying", lineObj.SipSession);
}
function onInviteProgress(lineObj, response){
    console.log("Call Progress:", response.message.statusCode);
    
    // Provisional 1xx
    // response.message.reasonPhrase
    if(response.message.statusCode == 180){
        $("#line-" + lineObj.LineNumber + "-msg").html(lang.ringing);
        
        var soundFile = audioBlobs.EarlyMedia_European;
        if(UserLocale().indexOf("us") > -1) soundFile = audioBlobs.EarlyMedia_US;
        if(UserLocale().indexOf("gb") > -1) soundFile = audioBlobs.EarlyMedia_UK;
        if(UserLocale().indexOf("au") > -1) soundFile = audioBlobs.EarlyMedia_Australia;
        if(UserLocale().indexOf("jp") > -1) soundFile = audioBlobs.EarlyMedia_Japan;

        // Play Early Media
        console.log("Audio:", soundFile.url);
        if(lineObj.SipSession.data.earlyMedia){
            // There is already early media playing
            // onProgress can be called multiple times
            // Don't add it again
            console.log("Early Media already playing");
        }
        else {
            var earlyMedia = new Audio(soundFile.blob);
            earlyMedia.preload = "auto";
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
            lineObj.SipSession.data.earlyMedia = earlyMedia;
        }
    }
    else if(response.message.statusCode === 183){
        $("#line-" + lineObj.LineNumber + "-msg").html(response.message.reasonPhrase + "...");

        // Add UI to allow DTMF
        $("#line-" + lineObj.LineNumber + "-early-dtmf").show();
    }
    else {
        // 181 = Call is Being Forwarded
        // 182 = Call is queued (Busy server!)
        // 199 = Call is Terminated (Early Dialog)

        $("#line-" + lineObj.LineNumber + "-msg").html(response.message.reasonPhrase + "...");
    }

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("progress", lineObj.SipSession);
}
function onInviteRejected(lineObj, response){
    console.log("INVITE Rejected:", response.message.reasonPhrase);

    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.reasonCode = response.message.statusCode;
    lineObj.SipSession.data.reasonText = response.message.reasonPhrase;

    teardownSession(lineObj);
}
function onInviteRedirected(response){
    console.log("onInviteRedirected", response);
    // Follow???
}

// General Session delegates
function onSessionReceivedBye(lineObj, response){
    // They Ended the call
    $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_ended);
    console.log("Call ended, bye!");

    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.reasonCode = 16;
    lineObj.SipSession.data.reasonText = "Normal Call clearing";

    response.accept(); // Send OK

    teardownSession(lineObj);
}
function onSessionReinvited(lineObj, response){
    // This may be used to include video streams
    var sdp = response.body;

    // All the possible streams will get 
    // Note, this will probably happen after the streams are added
    lineObj.SipSession.data.videoChannelNames = [];
    var videoSections = sdp.split("m=video");
    if(videoSections.length >= 1){
        for(var m=0; m<videoSections.length; m++){
            if(videoSections[m].indexOf("a=mid:") > -1 && videoSections[m].indexOf("a=label:") > -1){
                // We have a label for the media
                var lines = videoSections[m].split("\r\n");
                var channel = "";
                var mid = "";
                for(var i=0; i<lines.length; i++){
                    if(lines[i].indexOf("a=label:") == 0) {
                        channel = lines[i].replace("a=label:", "");
                    }
                    if(lines[i].indexOf("a=mid:") == 0){
                        mid = lines[i].replace("a=mid:", "");
                    }
                }
                lineObj.SipSession.data.videoChannelNames.push({"mid" : mid, "channel" : channel });
            }
        }
        console.log("videoChannelNames:", lineObj.SipSession.data.videoChannelNames);
        RedrawStage(lineObj.LineNumber, false);
    }
}
function onSessionReceivedMessage(lineObj, response){
    var messageType = (response.request.headers["Content-Type"].length >=1)? response.request.headers["Content-Type"][0].parsed : "Unknown" ;
    if(messageType.indexOf("application/x-asterisk-confbridge-event") > -1){
        // Conference Events JSON
        var msgJson = JSON.parse(response.request.body);

        var session = lineObj.SipSession;
        if(!session.data.ConfbridgeChannels) session.data.ConfbridgeChannels = [];
        if(!session.data.ConfbridgeEvents) session.data.ConfbridgeEvents = [];

        if(msgJson.type == "ConfbridgeStart"){
            console.log("ConfbridgeStart!");
        }
        else if(msgJson.type == "ConfbridgeWelcome"){
            console.log("Welcome to the Asterisk Conference");
            console.log("Bridge ID:", msgJson.bridge.id);
            console.log("Bridge Name:", msgJson.bridge.name);
            console.log("Created at:", msgJson.bridge.creationtime);
            console.log("Video Mode:", msgJson.bridge.video_mode);

            session.data.ConfbridgeChannels = msgJson.channels; // Write over this
            session.data.ConfbridgeChannels.forEach(function(chan) {
                // The mute and unmute status doesn't appear to be a realtime state, only what the 
                // startmuted= setting of the default profile is.
                console.log(chan.caller.name, "Is in the conference. Muted:", chan.muted, "Admin:", chan.admin);
            });
        }
        else if(msgJson.type == "ConfbridgeJoin"){
            msgJson.channels.forEach(function(chan) {
                var found = false;
                session.data.ConfbridgeChannels.forEach(function(existingChan) {
                    if(existingChan.id == chan.id) found = true;
                });
                if(!found){
                    session.data.ConfbridgeChannels.push(chan);
                    session.data.ConfbridgeEvents.push({ event: chan.caller.name + " ("+ chan.caller.number +") joined the conference", eventTime: utcDateNow() });
                    console.log(chan.caller.name, "Joined the conference. Muted: ", chan.muted);
                }
            });
        }
        else if(msgJson.type == "ConfbridgeLeave"){
            msgJson.channels.forEach(function(chan) {
                session.data.ConfbridgeChannels.forEach(function(existingChan, i) {
                    if(existingChan.id == chan.id){
                        session.data.ConfbridgeChannels.splice(i, 1);
                        console.log(chan.caller.name, "Left the conference");
                        session.data.ConfbridgeEvents.push({ event: chan.caller.name + " ("+ chan.caller.number +") left the conference", eventTime: utcDateNow() });
                    }
                });
            });
        }
        else if(msgJson.type == "ConfbridgeTalking"){
            var videoContainer = $("#line-" + lineObj.LineNumber + "-remote-videos");
            if(videoContainer){
                msgJson.channels.forEach(function(chan) {
                    videoContainer.find('video').each(function() {
                        if(this.srcObject.channel && this.srcObject.channel == chan.id) {
                            if(chan.talking_status == "on"){
                                console.log(chan.caller.name, "is talking.");
                                this.srcObject.isTalking = true;
                                $(this).css("border","1px solid red");
                            }
                            else {
                                console.log(chan.caller.name, "stopped talking.");
                                this.srcObject.isTalking = false;
                                $(this).css("border","1px solid transparent");
                            }
                        }
                    });
                });
            }
        }
        else if(msgJson.type == "ConfbridgeMute"){
            msgJson.channels.forEach(function(chan) {
                session.data.ConfbridgeChannels.forEach(function(existingChan) {
                    if(existingChan.id == chan.id){
                        console.log(existingChan.caller.name, "is now muted");
                        existingChan.muted = true;
                    }
                });
            });
            RedrawStage(lineObj.LineNumber, false);
        }
        else if(msgJson.type == "ConfbridgeUnmute"){
            msgJson.channels.forEach(function(chan) {
                session.data.ConfbridgeChannels.forEach(function(existingChan) {
                    if(existingChan.id == chan.id){
                        console.log(existingChan.caller.name, "is now unmuted");
                        existingChan.muted = false;
                    }
                });
            });
            RedrawStage(lineObj.LineNumber, false);
        }
        else if(msgJson.type == "ConfbridgeEnd"){
            console.log("The Asterisk Conference has ended, bye!");
        }
        else {
            console.warn("Unknown Asterisk Conference Event:", msgJson.type, msgJson);
        }
        RefreshLineActivity(lineObj.LineNumber);
        response.accept();
    } 
    else if(messageType.indexOf("application/x-myphone-confbridge-chat") > -1){
        console.log("x-myphone-confbridge-chat", response);


        response.accept();
    }
    else {
        console.warn("Unknown message type")
        response.reject();
    }
}

function onSessionDescriptionHandlerCreated(lineObj, sdh, provisional, includeVideo){
    if (sdh) {
        if(sdh.peerConnection){
            // console.log(sdh);
            sdh.peerConnection.ontrack = function(event){
                // console.log(event);
                onTrackAddedEvent(lineObj, includeVideo);
            }
            // sdh.peerConnectionDelegate = {
            //     ontrack: function(event){
            //         console.log(event);
            //         onTrackAddedEvent(lineObj, includeVideo);
            //     }
            // }
        }
        else{
            console.warn("onSessionDescriptionHandler fired without a peerConnection");
        }
    }
    else{
        console.warn("onSessionDescriptionHandler fired without a sessionDescriptionHandler");
    }
}
function onTrackAddedEvent(lineObj, includeVideo){
    // Gets remote tracks
    var session = lineObj.SipSession;
    // TODO: look at detecting video, so that UI switches to audio/video automatically.

    var pc = session.sessionDescriptionHandler.peerConnection;

    var remoteAudioStream = new MediaStream();
    var remoteVideoStream = new MediaStream();

    pc.getTransceivers().forEach(function (transceiver) {
        // Add Media
        var receiver = transceiver.receiver;
        if(receiver.track){
            if(receiver.track.kind == "audio"){
                console.log("Adding Remote Audio Track");
                remoteAudioStream.addTrack(receiver.track);
            }
            if(includeVideo && receiver.track.kind == "video"){
                if(transceiver.mid){
                    receiver.track.mid = transceiver.mid;
                    console.log("Adding Remote Video Track - ", receiver.track.readyState , "MID:", receiver.track.mid);
                    remoteVideoStream.addTrack(receiver.track);
                }
            }
        }
    });

    // Attach Audio
    if(remoteAudioStream.getAudioTracks().length >= 1){
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
    }

    if(includeVideo){
        // Single Or Multiple View
        $("#line-" + lineObj.LineNumber + "-remote-videos").empty();
        if(remoteVideoStream.getVideoTracks().length >= 1){
            var remoteVideoStreamTracks = remoteVideoStream.getVideoTracks();
            remoteVideoStreamTracks.forEach(function(remoteVideoStreamTrack) {
                var thisRemoteVideoStream = new MediaStream();
                thisRemoteVideoStream.trackID = remoteVideoStreamTrack.id;
                thisRemoteVideoStream.mid = remoteVideoStreamTrack.mid;
                remoteVideoStreamTrack.onended = function() {
                    console.log("Video Track Ended: ", this.mid);
                    RedrawStage(lineObj.LineNumber, true);
                }
                thisRemoteVideoStream.addTrack(remoteVideoStreamTrack);

                var wrapper = $("<span />", {
                    class: "VideoWrapper",
                });
                wrapper.css("width", "1px");
                wrapper.css("heigh", "1px");
                wrapper.hide();

                var callerID = $("<div />", {
                    class: "callerID"
                });
                wrapper.append(callerID);

                var Actions = $("<div />", {
                    class: "Actions"
                });
                wrapper.append(Actions);

                var videoEl = $("<video />", {
                    id: remoteVideoStreamTrack.id,
                    mid: remoteVideoStreamTrack.mid,
                    muted: true,
                    autoplay: true,
                    playsinline: true,
                    controls: false
                }); 
                videoEl.hide();

                var videoObj = videoEl.get(0);
                videoObj.srcObject = thisRemoteVideoStream;
                videoObj.onloadedmetadata = function(e) {
                    // videoObj.play();
                    videoEl.show();
                    videoEl.parent().show();
                    console.log("Playing Video Stream MID:", thisRemoteVideoStream.mid);
                    RedrawStage(lineObj.LineNumber, true);
                }
                wrapper.append(videoEl);

                $("#line-" + lineObj.LineNumber + "-remote-videos").append(wrapper);

                console.log("Added Video Element MID:", thisRemoteVideoStream.mid);
            });
        }
        else {
            console.log("No Video Streams");
            RedrawStage(lineObj.LineNumber, true);
        }
    }

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("trackAdded", session);
}

// General end of Session
function teardownSession(lineObj) {
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    if(session.data.teardownComplete == true) return;
    session.data.teardownComplete = true; // Run this code only once

    // Call UI
    if(session.data.earlyReject != true){
        HidePopup();
    }

    // End any child calls
    if(session.data.childsession){
        session.data.childsession.dispose().then(function(){
            session.data.childsession = null;
        }).catch(function(error){
            session.data.childsession = null;
            // Suppress message
        });
    }

    // Mixed Tracks
    if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
        session.data.AudioSourceTrack.stop();
        session.data.AudioSourceTrack = null;
    }
    // Stop any Early Media
    if(session.data.earlyMedia){
        session.data.earlyMedia.pause();
        session.data.earlyMedia.removeAttribute('src');
        session.data.earlyMedia.load();
        session.data.earlyMedia = null;
    }
    // Stop any ringing calls
    if(session.data.ringerObj){
        session.data.ringerObj.pause();
        session.data.ringerObj.removeAttribute('src');
        session.data.ringerObj.load();
        session.data.ringerObj = null;
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

    // Make sure you have released the microphone
    if(session && session.sessionDescriptionHandler && session.sessionDescriptionHandler.peerConnection){
        var pc = session.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach(function (RTCRtpSender) {
            if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                RTCRtpSender.track.stop();
            }
        });
    }

    // End timers
    window.clearInterval(session.data.videoResampleInterval);
    window.clearInterval(session.data.callTimer);

    // Add to stream
    AddCallMessage(lineObj.BuddyObj.identity, session);

    // Check if this call was missed
    if (session.data.calldirection == "inbound"){
        if(session.data.earlyReject){
            // Call was rejected without even ringing
            IncreaseMissedBadge(session.data.buddyId);
        } else if (session.data.terminateby == "them" && session.data.startTime == null){
            // Call Terminated by them during ringing
            if(session.data.reasonCode == 0){
                // Call was canceled, and not answered elsewhere 
                IncreaseMissedBadge(session.data.buddyId);
            }
        }
    }
    
    // Close up the UI
    window.setTimeout(function () {
        RemoveLine(lineObj);
    }, 1000);

    UpdateBuddyList();
    if(session.data.earlyReject != true){
        UpdateUI();
    }

    // Custom Web hook
    if(typeof web_hook_on_terminate !== 'undefined') web_hook_on_terminate(session);
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
        responsive: true,
        maintainAspectRatio: false,
        // devicePixelRatio: 1,
        animation: false,
        scales: {
            yAxes: [{
                ticks: { beginAtZero: true } //, min: 0, max: 100
            }],
            xAxes: [{
                display: false
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
            // Calculate Levels (0 - 255)
            var instPercent = (soundMeter.instant/255) * 100;
            $("#line-" + lineNum + "-Speaker").css("height", instPercent.toFixed(2) +"%");
        }, 50);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            if(audioReceiver != null) {
                audioReceiver.getStats().then(function(stats) {
                    stats.forEach(function(report){

                        var theMoment = utcDateNow();
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

                            soundMeter.ReceiveBitRate.push({ value: kbitsPerSec, timestamp : theMoment});
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

                            soundMeter.ReceivePacketRate.push({ value: PacketsPerSec, timestamp : theMoment});
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

                            soundMeter.ReceivePacketLoss.push({ value: PacketsLost, timestamp : theMoment});
                            ReceivePacketLossChart.data.datasets[0].data.push(PacketsLost);
                            ReceivePacketLossChart.data.labels.push("");
                            if(ReceivePacketLossChart.data.datasets[0].data.length > maxDataLength) {
                                ReceivePacketLossChart.data.datasets[0].data.splice(0,1);
                                ReceivePacketLossChart.data.labels.splice(0,1);
                            }
                            ReceivePacketLossChart.update();

                            // Receive Jitter
                            soundMeter.ReceiveJitter.push({ value: report.jitter, timestamp : theMoment});
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
                            var levelPercent = (report.audioLevel * 100);
                            soundMeter.ReceiveLevels.push({ value: levelPercent, timestamp : theMoment});
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
        responsive: true,    
        maintainAspectRatio: false,
        // devicePixelRatio: 1,
        animation: false,
        scales: {
            yAxes: [{
                ticks: { beginAtZero: true }
            }],
            xAxes: [{
                display: false
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
            // Calculate Levels (0 - 255)
            var instPercent = (soundMeter.instant/255) * 100;
            $("#line-" + lineNum + "-Mic").css("height", instPercent.toFixed(2) +"%");
        }, 50);
        soundMeter.networkInterval = window.setInterval(function (){
            // Calculate Network Conditions
            // Sending Audio Track
            if(audioSender != null) {
                audioSender.getStats().then(function(stats) {
                    stats.forEach(function(report){

                        var theMoment = utcDateNow();
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

                            soundMeter.SendBitRate.push({ value: kbitsPerSec, timestamp : theMoment});
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

                            soundMeter.SendPacketRate.push({ value: PacketsPerSec, timestamp : theMoment});
                            SendPacketRateChart.data.datasets[0].data.push(PacketsPerSec);
                            SendPacketRateChart.data.labels.push("");
                            if(SendPacketRateChart.data.datasets[0].data.length > maxDataLength) {
                                SendPacketRateChart.data.datasets[0].data.splice(0,1);
                                SendPacketRateChart.data.labels.splice(0,1);
                            }
                            SendPacketRateChart.update();
                        }
                        if(report.type == "track") {
                            // Bug/security concern... this seems always to report "0"
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
        catch(e) {
            console.warn("AudioContext() LocalAudio not available... its fine.");
        }
        if (audioContext == null) return null;
        this.context = audioContext;
        this.source = null;

        this.lineNum = lineNum;
        this.sessionId = sessionId;

        this.captureInterval = null;
        this.levelsInterval = null;
        this.networkInterval = null;
        this.startTime = 0;

        this.ReceiveBitRateChart = null;
        this.ReceiveBitRate = [];
        this.ReceivePacketRateChart = null;
        this.ReceivePacketRate = [];
        this.ReceivePacketLossChart = null;
        this.ReceivePacketLoss = [];
        this.ReceiveJitterChart = null;
        this.ReceiveJitter = [];
        this.ReceiveLevelsChart = null;
        this.ReceiveLevels = [];
        this.SendBitRateChart = null;
        this.SendBitRate = [];
        this.SendPacketRateChart = null;
        this.SendPacketRate = [];

        this.instant = 0; // Primary Output indicator

        this.AnalyserNode = this.context.createAnalyser();
        this.AnalyserNode.minDecibels = -90;
        this.AnalyserNode.maxDecibels = -10;
        this.AnalyserNode.smoothingTimeConstant = 0.85;
    }
    connectToSource(stream, callback) {
        console.log("SoundMeter connecting...");
        try {
            this.source = this.context.createMediaStreamSource(stream);
            this.source.connect(this.AnalyserNode);
            // this.AnalyserNode.connect(this.context.destination); // Can be left unconnected
            this._start();

            callback(null);
        }
        catch(e) {
            console.error(e); // Probably not audio track
            callback(e);
        }
    }
    _start(){
        var self = this;
        self.instant = 0;
        self.AnalyserNode.fftSize = 32; // 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, and 32768. Defaults to 2048
        self.dataArray = new Uint8Array(self.AnalyserNode.frequencyBinCount);

        this.captureInterval = window.setInterval(function(){
            self.AnalyserNode.getByteFrequencyData(self.dataArray); // Populate array with data from 0-255

            // Just take the maximum value of this data
            self.instant = 0;
            for(var d = 0; d < self.dataArray.length; d++) {
                if(self.dataArray[d] > self.instant) self.instant = self.dataArray[d];
            }

        }, 1);
    }
    stop() {
        console.log("Disconnecting SoundMeter...");
        window.clearInterval(this.captureInterval);
        this.captureInterval = null;
        window.clearInterval(this.levelsInterval);
        this.levelsInterval = null;
        window.clearInterval(this.networkInterval);
        this.networkInterval = null;
        try {
            this.source.disconnect();
        }
        catch(e) { }
        this.source = null;
        try {
            this.AnalyserNode.disconnect();
        }
        catch(e) { }
        this.AnalyserNode = null;
        try {
            this.context.close();
        }
        catch(e) { }
        this.context = null;

        // Save to IndexDb
        var lineObj = FindLineByNumber(this.lineNum);
        var QosData = {
            ReceiveBitRate: this.ReceiveBitRate,
            ReceivePacketRate: this.ReceivePacketRate,
            ReceivePacketLoss: this.ReceivePacketLoss,
            ReceiveJitter: this.ReceiveJitter,
            ReceiveLevels: this.ReceiveLevels,
            SendBitRate: this.SendBitRate,
            SendPacketRate: this.SendPacketRate,
        }
        if(this.sessionId != null){
            SaveQosData(QosData, this.sessionId, lineObj.BuddyObj.identity);
        }
    }
}
function MeterSettingsOutput(audioStream, objectId, direction, interval){
    var soundMeter = new SoundMeter(null, null);
    soundMeter.startTime = Date.now();
    soundMeter.connectToSource(audioStream, function (e) {
        if (e != null) return;

        console.log("SoundMeter Connected, displaying levels to:"+ objectId);
        soundMeter.levelsInterval = window.setInterval(function () {
            // Calculate Levels (0 - 255)
            var instPercent = (soundMeter.instant/255) * 100;
            $("#"+ objectId).css(direction, instPercent.toFixed(2) +"%");
        }, interval);
    });

    return soundMeter;
}

// QOS
// ===
function SaveQosData(QosData, sessionId, buddy){
    if(CallQosDataIndexDb != null){

        // Prepare data to write
        var data = {
            uID: uID(),
            sessionid: sessionId,
            buddy: buddy,
            QosData: QosData
        }
        // Commit Transaction
        var transaction = CallQosDataIndexDb.transaction(["CallQos"], "readwrite");
        var objectStoreAdd = transaction.objectStore("CallQos").add(data);
        objectStoreAdd.onsuccess = function(event) {
            console.log("Call CallQos Success: ", sessionId);
        }
    }
    else {
        console.warn("CallQosDataIndexDb is null.");
    }
}
function DisplayQosData(sessionId){
    if(CallQosDataIndexDb != null){
        var transaction = CallQosDataIndexDb.transaction(["CallQos"]);
        var objectStoreGet = transaction.objectStore("CallQos").index('sessionid').getAll(sessionId);
        objectStoreGet.onerror = function(event) {
            console.error("IndexDB Get Error:", event);
        }
        objectStoreGet.onsuccess = function(event) {
            // There can be more than 2 sets of outbound data if the microphone changes
            var QosData0 = {
                ReceiveBitRate: [],
                ReceiveJitter: [],
                ReceiveLevels: [],
                ReceivePacketLoss: [],
                ReceivePacketRate: [],
                SendBitRate: [],
                SendPacketRate: []
            }; // Receive
            var QosData1 = {
                ReceiveBitRate: [],
                ReceiveJitter: [],
                ReceiveLevels: [],
                ReceivePacketLoss: [],
                ReceivePacketRate: [],
                SendBitRate: [],
                SendPacketRate: []
            }; // Send (Can be multiple if microphone changes)
            if(event.target.result && event.target.result.length >= 1){

                $.each(event.target.result, function(i,result){
                    // ReceiveBitRate
                    $.each(result.QosData.ReceiveBitRate, function(i,dataArray){
                        QosData0.ReceiveBitRate.push(dataArray);
                    });
                    // ReceiveJitter
                    $.each(result.QosData.ReceiveJitter, function(i,dataArray){
                        QosData0.ReceiveJitter.push(dataArray);
                    });
                    // ReceiveLevels
                    $.each(result.QosData.ReceiveLevels, function(i,dataArray){
                        QosData0.ReceiveLevels.push(dataArray);
                    });
                    // ReceivePacketLoss
                    $.each(result.QosData.ReceivePacketLoss, function(i,dataArray){
                        QosData0.ReceivePacketLoss.push(dataArray);
                    });
                    // ReceivePacketRate
                    $.each(result.QosData.ReceivePacketRate, function(i,dataArray){
                        QosData0.ReceivePacketRate.push(dataArray);
                    });

                    // SendBitRate
                    $.each(result.QosData.SendBitRate, function(i,dataArray){
                        QosData1.SendBitRate.push(dataArray);
                    });
                    // SendPacketRate
                    $.each(result.QosData.SendPacketRate, function(i,dataArray){
                        QosData1.SendPacketRate.push(dataArray);
                    });
                });

                // This is the correct data
                // var QosData0 = event.target.result[0].QosData;
                // ReceiveBitRate: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // ReceiveJitter: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // ReceiveLevels: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // ReceivePacketLoss: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // ReceivePacketRate: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // SendBitRate: []
                // SendPacketRate: []

                // var QosData1 = event.target.result[1].QosData;
                // ReceiveBitRate: []
                // ReceiveJitter: []
                // ReceiveLevels: []
                // ReceivePacketLoss: []
                // ReceivePacketRate: []
                // SendBitRate: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
                // SendPacketRate: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]

            } else{
                console.warn("Result not expected", event.target.result);
                return
            }

            Chart.defaults.global.defaultFontSize = 12;
            var ChatHistoryOptions = { 
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: true } //, min: 0, max: 100
                    }],
                    xAxes: [{
                        display: false
                    }]
                }, 
            }

            // ReceiveBitRateChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.ReceiveBitRate.length > 0)? QosData0.ReceiveBitRate : QosData1.ReceiveBitRate;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var ReceiveBitRateChart = new Chart($("#cdr-AudioReceiveBitRate"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.receive_kilobits_per_second,
                        data: dataset,
                        backgroundColor: 'rgba(168, 0, 0, 0.5)',
                        borderColor: 'rgba(168, 0, 0, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });

            // ReceivePacketRateChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.ReceivePacketRate.length > 0)? QosData0.ReceivePacketRate : QosData1.ReceivePacketRate;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var ReceivePacketRateChart = new Chart($("#cdr-AudioReceivePacketRate"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.receive_packets_per_second,
                        data: dataset,
                        backgroundColor: 'rgba(168, 0, 0, 0.5)',
                        borderColor: 'rgba(168, 0, 0, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });

            // AudioReceivePacketLossChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.ReceivePacketLoss.length > 0)? QosData0.ReceivePacketLoss : QosData1.ReceivePacketLoss;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var AudioReceivePacketLossChart = new Chart($("#cdr-AudioReceivePacketLoss"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.receive_packet_loss,
                        data: dataset,
                        backgroundColor: 'rgba(168, 99, 0, 0.5)',
                        borderColor: 'rgba(168, 99, 0, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });

            // AudioReceiveJitterChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.ReceiveJitter.length > 0)? QosData0.ReceiveJitter : QosData1.ReceiveJitter;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var AudioReceiveJitterChart = new Chart($("#cdr-AudioReceiveJitter"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.receive_jitter,
                        data: dataset,
                        backgroundColor: 'rgba(0, 38, 168, 0.5)',
                        borderColor: 'rgba(0, 38, 168, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });
            
            // AudioReceiveLevelsChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.ReceiveLevels.length > 0)? QosData0.ReceiveLevels : QosData1.ReceiveLevels;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var AudioReceiveLevelsChart = new Chart($("#cdr-AudioReceiveLevels"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.receive_audio_levels,
                        data: dataset,
                        backgroundColor: 'rgba(140, 0, 168, 0.5)',
                        borderColor: 'rgba(140, 0, 168, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });
            
            // SendPacketRateChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.SendPacketRate.length > 0)? QosData0.SendPacketRate : QosData1.SendPacketRate;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var SendPacketRateChart = new Chart($("#cdr-AudioSendPacketRate"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.send_packets_per_second,
                        data: dataset,
                        backgroundColor: 'rgba(0, 121, 19, 0.5)',
                        borderColor: 'rgba(0, 121, 19, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });

            // AudioSendBitRateChart
            var labelSet = [];
            var dataset = [];
            var data = (QosData0.SendBitRate.length > 0)? QosData0.SendBitRate : QosData1.SendBitRate;
            $.each(data, function(i,item){
                labelSet.push(moment.utc(item.timestamp.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat));
                dataset.push(item.value);
            });
            var AudioSendBitRateChart = new Chart($("#cdr-AudioSendBitRate"), {
                type: 'line',
                data: {
                    labels: labelSet,
                    datasets: [{
                        label: lang.send_kilobits_per_second,
                        data: dataset,
                        backgroundColor: 'rgba(0, 121, 19, 0.5)',
                        borderColor: 'rgba(0, 121, 19, 1)',
                        borderWidth: 1,
                        pointRadius: 1
                    }]
                },
                options: ChatHistoryOptions
            });

        }
    }
    else {
        console.warn("CallQosDataIndexDb is null.");
    }
}
function DeleteQosData(buddy, stream){

    if(CallQosDataIndexDb != null){
        // Loop and Delete
        // Note:  This database can only delete based on Primary Key
        // The The Primary Key is arbitrary, so you must get all the rows based
        // on a lookup, and delete from there.
        $.each(stream.DataCollection, function (i, item) {
            if (item.ItemType == "CDR" && item.SessionId && item.SessionId != "") {
                console.log("Deleting CallQosData: ", item.SessionId);
                var objectStore = CallQosDataIndexDb.transaction(["CallQos"], "readwrite").objectStore("CallQos");
                var objectStoreGet = objectStore.index('sessionid').getAll(item.SessionId);
                objectStoreGet.onerror = function(event) {
                    console.error("IndexDB Get Error:", event);
                }
                objectStoreGet.onsuccess = function(event) {
                    if(event.target.result && event.target.result.length > 0){
                        // There sre some rows to delete
                        $.each(event.target.result, function(i, item){
                            // console.log("Delete: ", item.uID);
                            try{
                                objectStore.delete(item.uID);
                            } catch(e){
                                console.log("Call CallQosData Delete failed: ", e);
                            }
                        });
                    }
                }
            }
        });
    }
    else {
        console.warn("CallQosDataIndexDb is null.");
    }
}

// Presence / Subscribe
// ====================
function SubscribeAll() {
    if(!userAgent.isRegistered()) return;

    if(VoiceMailSubscribe){
        SubscribeVoicemail();
    }
    if(SubscribeToYourself){
        SelfSubscribe();
    }

    // Start subscribe all
    if(userAgent.BlfSubs && userAgent.BlfSubs.length > 0){
        UnsubscribeAll();
    }
    userAgent.BlfSubs = [];
    if(Buddies.length >= 1){
        console.log("Starting Subscribe of all ("+ Buddies.length +") Extension Buddies...");
        for(var b=0; b<Buddies.length; b++) {
            SubscribeBuddy(Buddies[b]);
        }
    }
}
function SelfSubscribe(){
    if(!userAgent.isRegistered()) return;

    if(userAgent.selfSub){
        console.log("Unsubscribe from old self subscribe...");
        SelfUnsubscribe();
    }

    var targetURI = SIP.UserAgent.makeURI("sip:" + SipUsername + "@" + SipDomain);

    var options = { 
        expires: SubscribeBuddyExpires, 
        extraHeaders: ['Accept: '+ SubscribeBuddyAccept]
    }

    userAgent.selfSub = new SIP.Subscriber(userAgent, targetURI, SubscribeBuddyEvent, options);
    userAgent.selfSub.delegate = {
        onNotify: function(sip) {
            ReceiveNotify(sip, true);
        }
    }
    console.log("SUBSCRIBE Self: "+ SipUsername +"@" + SipDomain);
    userAgent.selfSub.subscribe().catch(function(error){
        console.warn("Error subscribing to yourself:", error);
    });
}

function SubscribeVoicemail(){
    if(!userAgent.isRegistered()) return;

    if(userAgent.voicemailSub){
        console.log("Unsubscribe from old voicemail Messages...");
        UnsubscribeVoicemail();
    }

    var vmOptions = { expires : SubscribeVoicemailExpires }
    var targetURI = SIP.UserAgent.makeURI("sip:" + SipUsername + "@" + SipDomain);
    userAgent.voicemailSub = new SIP.Subscriber(userAgent, targetURI, "message-summary", vmOptions);
    userAgent.voicemailSub.delegate = {
        onNotify: function(sip) {
            VoicemailNotify(sip);
        }
    }
    console.log("SUBSCRIBE VOICEMAIL: "+ SipUsername +"@" + SipDomain);
    userAgent.voicemailSub.subscribe().catch(function(error){
        console.warn("Error subscribing to voicemail notifications:", error);
    });
}


function SubscribeBuddy(buddyObj) {
    if(!userAgent.isRegistered()) return;

    if((buddyObj.type == "extension" || buddyObj.type == "xmpp") && buddyObj.EnableSubscribe == true && buddyObj.SubscribeUser != "") {

        var targetURI = SIP.UserAgent.makeURI("sip:" + buddyObj.SubscribeUser + "@" + SipDomain);

        var options = { 
            expires: SubscribeBuddyExpires, 
            extraHeaders: ['Accept: '+ SubscribeBuddyAccept]
        }
        var blfSubscribe = new SIP.Subscriber(userAgent, targetURI, SubscribeBuddyEvent, options);
        blfSubscribe.data = {}
        blfSubscribe.data.buddyId = buddyObj.identity;
        blfSubscribe.delegate = {
            onNotify: function(sip) {
                ReceiveNotify(sip, false);
            }
        }
        console.log("SUBSCRIBE: "+ buddyObj.SubscribeUser +"@" + SipDomain);
        blfSubscribe.subscribe().catch(function(error){
            console.warn("Error subscribing to Buddy notifications:", error);
        });

        if(!userAgent.BlfSubs) userAgent.BlfSubs = [];
        userAgent.BlfSubs.push(blfSubscribe);
    }
}

function UnsubscribeAll() {
    if(!userAgent.isRegistered()) return;

    console.log("Unsubscribe from voicemail Messages...");
    UnsubscribeVoicemail();

    if(userAgent.BlfSubs && userAgent.BlfSubs.length > 0){
        console.log("Unsubscribing "+ userAgent.BlfSubs.length + " subscriptions...");
        for (var blf = 0; blf < userAgent.BlfSubs.length; blf++) {
            UnsubscribeBlf(userAgent.BlfSubs[blf]);
        }
        userAgent.BlfSubs = [];

        for(var b=0; b<Buddies.length; b++) {
            var buddyObj = Buddies[b];
            if(buddyObj.type == "extension" || buddyObj.type == "xmpp") {
                $("#contact-" + buddyObj.identity + "-devstate").prop("class", "dotOffline");
                $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", "dotOffline");
                $("#contact-" + buddyObj.identity + "-presence").html(lang.state_unknown);
                $("#contact-" + buddyObj.identity + "-presence-main").html(lang.state_unknown);
            }
        }
    }
}
function UnsubscribeBlf(blfSubscribe){
    if(!userAgent.isRegistered()) return;

    if(blfSubscribe.state == SIP.SubscriptionState.Subscribed){
        console.log("Unsubscribe to BLF Messages...", blfSubscribe.data.buddyId);
        blfSubscribe.unsubscribe().catch(function(error){
            console.warn("Error removing BLF notifications:", error);
        });
    } 
    else {
        console.log("Incorrect buddy subscribe state", blfSubscribe.data.buddyId, blfSubscribe.state);
    }
    blfSubscribe.dispose().catch(function(error){
        console.warn("Error disposing BLF notifications:", error);
    });
    blfSubscribe = null;
}
function UnsubscribeVoicemail(){
    if(!userAgent.isRegistered()) return;

    if(userAgent.voicemailSub){
        console.log("Unsubscribe to voicemail Messages...", userAgent.voicemailSub.state);
        if(userAgent.voicemailSub.state == SIP.SubscriptionState.Subscribed){
            userAgent.voicemailSub.unsubscribe().catch(function(error){
                console.warn("Error removing voicemail notifications:", error);
            });
        }
        userAgent.voicemailSub.dispose().catch(function(error){
            console.warn("Error disposing voicemail notifications:", error);
        });
    } else {
        console.log("Not subscribed to MWI");
    }
    userAgent.voicemailSub = null;
}
function SelfUnsubscribe(){
    if(!userAgent.isRegistered()) return;

    if(userAgent.selfSub){
        console.log("Unsubscribe from yourself...", userAgent.selfSub.state);
        if(userAgent.selfSub.state == SIP.SubscriptionState.Subscribed){
            userAgent.selfSub.unsubscribe().catch(function(error){
                console.warn("Error self subscription:", error);
            });
        }
        userAgent.selfSub.dispose().catch(function(error){
            console.warn("Error disposing self subscription:", error);
        });
    } else {
        console.log("Not subscribed to Yourself");
    }
    userAgent.selfSub = null;
}

function UnsubscribeBuddy(buddyObj) {
    console.log("Unsubscribe: ", buddyObj.identity);
    if(buddyObj.type == "extension" || buddyObj.type == "xmpp") {
        if(userAgent && userAgent.BlfSubs && userAgent.BlfSubs.length > 0){
            for (var blf = 0; blf < userAgent.BlfSubs.length; blf++) {
                var blfSubscribe = userAgent.BlfSubs[blf];
                if(blfSubscribe.data.buddyId == buddyObj.identity){
                    console.log("Subscription found, removing: ", buddyObj.identity);
                    UnsubscribeBlf(userAgent.BlfSubs[blf]);
                    userAgent.BlfSubs.splice(blf, 1);
                    break;
                }
            }
        }
    }
}
// Subscription Events
// ===================
function VoicemailNotify(notification){
    // Messages-Waiting: yes        <-- yes/no
    // Voice-Message: 1/0           <-- new/old
    // Voice-Message: 1/0 (0/0)     <-- new/old (ugent new/old)
    if(notification.request.body.indexOf("Messages-Waiting:") > -1){
        notification.accept();

        var messagesWaiting = (notification.request.body.indexOf("Messages-Waiting: yes") > -1)
        var newVoiceMessages = 0;
        var oldVoiceMessages = 0;
        var ugentNewVoiceMessage = 0;
        var ugentOldVoiceMessage = 0;

        if(messagesWaiting){
            console.log("Messages Waiting!");
            var lines = notification.request.body.split("\r\n");
            for(var l=0; l<lines.length; l++){
                if(lines[l].indexOf("Voice-Message: ") > -1){
                    var value = lines[l].replace("Voice-Message: ", ""); // 1/0 (0/0)
                    if(value.indexOf(" (") > -1){
                        // With Ugent options
                        newVoiceMessages = parseInt(value.split(" (")[0].split("\/")[0]);
                        oldVoiceMessages = parseInt(value.split(" (")[0].split("\/")[1]);
                        ugentNewVoiceMessage = parseInt(value.split(" (")[1].replace(")","").split("\/")[0]);
                        ugentOldVoiceMessage = parseInt(value.split(" (")[1].replace(")","").split("\/")[1]);
                    } else {
                        // Without
                        newVoiceMessages = parseInt(value.split("\/")[0]);
                        oldVoiceMessages = parseInt(value.split("\/")[1]);
                    }
                }
            }
            console.log("Voicemail: ", newVoiceMessages, oldVoiceMessages, ugentNewVoiceMessage, ugentOldVoiceMessage);

            // Show the messages waiting bubble
            $("#TxtVoiceMessages").html(""+ newVoiceMessages)
            $("#TxtVoiceMessages").show();

            // Show a system notification
            if(newVoiceMessages > userAgent.lastVoicemailCount){
                userAgent.lastVoicemailCount = newVoiceMessages;

                if ("Notification" in window) {
                    if (Notification.permission === "granted") {

                        var noticeOptions = { 
                            body: lang.you_have_new_voice_mail.replace("{0}", newVoiceMessages)
                        }

                        var vmNotification = new Notification(lang.new_voice_mail, noticeOptions);
                        vmNotification.onclick = function (event) {
                            if(VoicemailDid != ""){
                                DialByLine("audio", null, VoicemailDid, lang.voice_mail);
                            }
                        }
                    }
                }

            }

        } else {
            // Hide the messages waiting bubble
            $("#TxtVoiceMessages").html("0")
            $("#TxtVoiceMessages").hide();
        }

        if(typeof web_hook_on_messages_waiting !== 'undefined') {
            web_hook_on_messages_waiting(newVoiceMessages, oldVoiceMessages, ugentNewVoiceMessage, ugentOldVoiceMessage);
        }
    }
    else {
        // Doesn't seem to be an message notification https://datatracker.ietf.org/doc/html/rfc3842
        notification.reject();
    }
}
function ReceiveNotify(notification, selfSubscribe) {
    if (userAgent == null || !userAgent.isRegistered()) return;

    notification.accept();

    var buddy = "";
    var dotClass = "dotOffline";
    var Presence = "Unknown";

    var ContentType = "";
    if(notification.request.headers.length > 0 && notification.request.headers["Content-Type"] && notification.request.headers["Content-Type"][0]){
        ContentType = notification.request.headers["Content-Type"][0].parsed;
    }
    if (ContentType == "application/pidf+xml") {
        // Handle Presence
        /*
        // Asterisk chan_sip
        <?xml version="1.0" encoding="ISO-8859-1"?>
        <presence
            xmlns="urn:ietf:params:xml:ns:pidf" 
            xmlns:pp="urn:ietf:params:xml:ns:pidf:person" 
            xmlns:es="urn:ietf:params:xml:ns:pidf:rid:status:rid-status"
            xmlns:ep="urn:ietf:params:xml:ns:pidf:rid:rid-person"
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

        // Asterisk chan_pj-sip
        <?xml version="1.0" encoding="UTF-8"?>
        <presence 
            entity="sip:300@192.168.88.40:443;transport=ws" 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            xmlns:dm="urn:ietf:params:xml:ns:pidf:data-model" 
            xmlns:rid="urn:ietf:params:xml:ns:pidf:rid">
            <note>Ready</note>
            <tuple id="300">
                <status>
                    <basic>open</basic>
                </status>
                <contact priority="1">sip:User1@raspberrypi.local</contact>
            </tuple>
            <dm:person />
        </presence>

        // OpenSIPS 
        <?xml version="1.0"?>
        <presence 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            entity="sip:200@ws-eu-west-1.innovateasterisk.com">
            <tuple xmlns="urn:ietf:params:xml:ns:pidf" id="tuple_mixing-id">
                <status>
                    <basic>closed</basic>
                </status>
            </tuple>
        </presence>

        <?xml version="1.0"?>
        <presence 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            entity="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com">
            <tuple 
                xmlns="urn:ietf:params:xml:ns:pidf" 
                id="0x7ffe17f496c0">
                <status>
                    <basic>open</basic>
                </status>
            </tuple>
        </presence>


        <?xml version="1.0"?>
        <presence 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            entity="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com">
            <tuple 
                xmlns="urn:ietf:params:xml:ns:pidf" 
                id="tuple_mixing-id">
                <status>
                    <basic>open</basic>
                </status>
            </tuple>
            <note xmlns="urn:ietf:params:xml:ns:pidf">On the phone</note>
            <dm:person 
                xmlns:dm="urn:ietf:params:xml:ns:pidf:data-model" 
                xmlns:rid="urn:ietf:params:xml:ns:pidf:rid" 
                id="peers_mixing-id">
                <rid:activities>
                    <rid:on-the-phone/>
                </rid:activities>
                <dm:note>On the phone</dm:note>
            </dm:person>
        </presence>

        // There can be more than one tuple
        <?xml version="1.0"?>
        <presence 
            xmlns="urn:ietf:params:xml:ns:pidf" 
            entity="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com">
            <tuple 
                xmlns="urn:ietf:params:xml:ns:pidf" 
                id="0x7ffce2b4b1a0">
                <status>
                    <basic>open</basic>
                </status>
            </tuple>
            <tuple 
                xmlns="urn:ietf:params:xml:ns:pidf"
                id="0x7ffd6abd4a40">
                <status>
                    <basic>open</basic>
                </status>
            </tuple>
        </presence>
"


open: In the context of INSTANT MESSAGES, this value means that the
    associated <contact> element, if any, corresponds to an INSTANT
    INBOX that is ready to accept an INSTANT MESSAGE.

closed: In the context of INSTANT MESSAGES, this value means that
    the associated <contact> element, if any, corresponds to an
    INSTANT INBOX that is unable to accept an INSTANT MESSAGE.

        */

        var xml = $($.parseXML(notification.request.body));

        // The value of the 'entity' attribute is the 'pres' URL of the PRESENT publishing this presence document.
        // (In some cases this can present as the user... what if using DIDs)
        var ObservedUser = xml.find("presence").attr("entity");
        buddy = ObservedUser.split("@")[0].split(":")[1];
        // buddy = xml.find("presence").find("tuple").attr("id"); // Asterisk does this, but its not correct.
        // buddy = notification.request.from.uri.user; // Unreliable 

        var availability = "closed"
        // availability = xml.find("presence").find("tuple").find("status").find("basic").text();
        var tuples = xml.find("presence").find("tuple");
        if(tuples){
            $.each(tuples, function(i, obj){
                // So if any of the contacts are open, then say open
                if($(obj).find("status").find("basic").text() == "open") {
                    availability = "open";
                }
            });
        }

        Presence = xml.find("presence").find("note").text(); 
        if(Presence == ""){
            if (availability == "open") Presence = "Ready";
            if (availability == "closed") Presence = "Not online";
        }
    }
    else if (ContentType == "application/dialog-info+xml") {
        // Handle "Dialog" State

        var xml = $($.parseXML(notification.request.body));

        /*
        Asterisk:
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

        OpenSIPS:
        <?xml version="1.0"?>
        <dialog-info 
            xmlns="urn:ietf:params:xml:ns:dialog-info" 
            version="18" 
            state="full" 
            entity="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com"
        />

        <?xml version="1.0"?>
        <dialog-info 
            xmlns="urn:ietf:params:xml:ns:dialog-info" 
            version="17" 
            entity="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com" 
            state="partial">
            <dialog 
                id="soe2vr886cbn1ccj3h.0" 
    *           local-tag="ceq735vrh" 
    *           remote-tag="a1d22259-28ea-434f-9680-b925218b7418" 
                direction="initiator">
                <state>terminated</state>
    *           <remote>
                    <identity display="Bob">sip:*65@ws-eu-west-1.innovateasterisk.com</identity>
                    <target uri="sip:*65@ws-eu-west-1.innovateasterisk.com"/>
    *           </remote>
    *           <local>
                    <identity display="Conrad De Wet">sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com</identity>
                    <target uri="sip:TTbXG7XMO@ws-eu-west-1.innovateasterisk.com"/>
                </local>
            </dialog>
        </dialog-info>
        */

        var ObservedUser = xml.find("dialog-info").attr("entity");
        buddy = ObservedUser.split("@")[0].split(":")[1];

        var version = xml.find("dialog-info").attr("version"); // 1|2|etc
        var DialogState = xml.find("dialog-info").attr("state"); // full|partial
        var extId = xml.find("dialog-info").find("dialog").attr("id"); // qoe2vr886cbn1ccj3h.0

        var state = xml.find("dialog-info").find("dialog").find("state").text();
        if (state == "terminated") Presence = "Ready";
        if (state == "trying") Presence = "On the phone";
        if (state == "proceeding") Presence = "On the phone";
        if (state == "early") Presence = "Ringing";
        if (state == "confirmed") Presence = "On the phone";

        // The dialog states only report devices states, and cant say online or offline.
    }

    if(selfSubscribe){
        if(buddy == SipUsername){
            console.log("Self Notify:", Presence);

            // Custom Handling of Notify/BLF
            if(typeof web_hook_on_self_notify !== 'undefined')  web_hook_on_self_notify(ContentType, notification.request.body);
        }
        else {
            console.warn("Self Subscribe Notify, but wrong user returned.", buddy, SipUsername);
        }
        return;
    }

    var buddyObj = FindBuddyByObservedUser(buddy);
    if(buddyObj == null) {
        console.warn("Buddy not found:", buddy);
        return;
    }

    // dotOnline | dotOffline | dotRinging | dotInUse | dotReady | dotOnHold
    if (Presence == "Not online") dotClass = "dotOffline";
    if (Presence == "Unavailable") dotClass = "dotOffline";
    if (Presence == "Ready") dotClass = "dotOnline";
    if (Presence == "On the phone") dotClass = "dotInUse";
    if (Presence == "Proceeding") dotClass = "dotInUse";
    if (Presence == "Ringing") dotClass = "dotRinging";
    if (Presence == "On hold") dotClass = "dotOnHold";

    // SIP Device Sate indicators
    console.log("Setting DevSate State for "+ buddyObj.CallerIDName +" to "+ dotClass);
    buddyObj.devState = dotClass;
    $("#contact-" + buddyObj.identity + "-devstate").prop("class", dotClass);
    $("#contact-" + buddyObj.identity + "-devstate-main").prop("class", dotClass);

    // Presence (SIP / XMPP)
    // SIP uses Devices states only
    // XMPP uses Device states, and Presence, but only XMPP Presence will display a text message
    if(buddyObj.type != "xmpp"){
        console.log("Setting Presence for "+ buddyObj.CallerIDName +" to "+ Presence);
        
        buddyObj.presence = Presence;
        if (Presence == "Not online") Presence = lang.state_not_online;
        if (Presence == "Ready") Presence = lang.state_ready;
        if (Presence == "On the phone") Presence = lang.state_on_the_phone;
        if (Presence == "Proceeding") Presence = lang.state_on_the_phone;
        if (Presence == "Ringing") Presence = lang.state_ringing;
        if (Presence == "On hold") Presence = lang.state_on_hold;
        if (Presence == "Unavailable") Presence = lang.state_unavailable;
        $("#contact-" + buddyObj.identity + "-presence").html(Presence);
        $("#contact-" + buddyObj.identity + "-presence-main").html(Presence);
    }

    // Custom Handling of Notify/BLF
    if(typeof web_hook_on_notify !== 'undefined')  web_hook_on_notify(ContentType, buddyObj, notification.request.body);
}

// Buddy: Chat / Instant Message / XMPP
// ====================================
function InitialiseStream(buddy){
    var template = { TotalRows:0, DataCollection:[] }
    localDB.setItem(buddy + "-stream", JSON.stringify(template));
    return JSON.parse(localDB.getItem(buddy + "-stream"));
}
function SendChatMessage(buddy) {
    if (userAgent == null) return;
    if (!userAgent.isRegistered()) return;

    $("#contact-" + buddy + "-ChatMessage").focus(); // refocus on the textarea

    var message = $("#contact-" + buddy + "-ChatMessage").val();
    message = $.trim(message);
    if(message == "") {
        Alert(lang.alert_empty_text_message, lang.no_message);
        return;
    }
    // Note: AMI has this limit, but only if you use AMI to transmit
    // if(message.length > 755){
    //     Alert("Asterisk has a limit on the message size (755). This message is too long, and cannot be delivered.", "Message Too Long");
    //     return;
    // }

    var messageId = uID();
    var buddyObj = FindBuddyByIdentity(buddy);

    // Update Stream
    var DateTime = moment.utc().format("YYYY-MM-DD HH:mm:ss UTC");
    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitialiseStream(buddy);

    // Add New Message
    var newMessageJson = {
        ItemId: messageId,
        ItemType: "MSG",
        ItemDate: DateTime,
        SrcUserId: profileUserID,
        Src: "\""+ profileName +"\"",
        DstUserId: buddyObj.identity,
        Dst: "",
        MessageData: message
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    // SIP Messages (Note, this may not work as required)
    // ============
    if(buddyObj.type == "extension") {
        var chatBuddy = SIP.UserAgent.makeURI("sip:"+ buddyObj.ExtNo.replace(/#/g, "%23") + "@" + SipDomain);
        console.log("MESSAGE: "+ chatBuddy + " (extension)");


        var MessagerMessageOptions = {
            requestDelegate : {
                onAccept: function(sip){
                    console.log("Message Accepted:", messageId);
                    MarkMessageSent(buddyObj, messageId, true);
                },
                onReject: function(sip){
                    console.warn("Message Error", sip.message.reasonPhrase);
                    MarkMessageNotSent(buddyObj, messageId, true);
                }
            },
            requestOptions : {
                extraHeaders: [],
            }
        }
        var messageObj = new SIP.Messager(userAgent, chatBuddy, message, "text/plain");
        messageObj.message(MessagerMessageOptions).then(function(){
            // Custom Web hook
            if(typeof web_hook_on_message !== 'undefined') web_hook_on_message(messageObj);
        });
    }

    // XMPP Messages
    // =============
    if(buddyObj.type == "xmpp"){
        console.log("MESSAGE: "+ buddyObj.jid + " (xmpp)");
        XmppSendMessage(buddyObj, message, messageId);

        // Custom Web hook
        if(typeof web_hook_on_message !== 'undefined') web_hook_on_message(message);
    }

    // Group Chat
    // ==========
    if(buddyObj.type == "group"){
        // TODO
    }

    // Post Add Activity
    $("#contact-" + buddy + "-ChatMessage").val("");
    $("#contact-" + buddy + "-dictate-message").hide();
    $("#contact-" + buddy + "-emoji-menu").hide();
    $("#contact-" + buddy + "-ChatMessage").focus();

    if(buddyObj.recognition != null){
        buddyObj.recognition.abort();
        buddyObj.recognition = null;
    }

    UpdateBuddyActivity(buddy);
    RefreshStream(buddyObj);
}
function MarkMessageSent(buddyObj, messageId, refresh){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "MSG" && item.ItemId == messageId) {
                // Found
                item.Sent = true;
                return false;
            }
        });
        localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

        if(refresh) RefreshStream(buddyObj);
    }
}
function MarkMessageNotSent(buddyObj, messageId, refresh){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "MSG" && item.ItemId == messageId) {
                // Found
                item.Sent = false;
                return false;
            }
        });
        localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

        if(refresh) RefreshStream(buddyObj);
    }
}
function MarkDeliveryReceipt(buddyObj, messageId, refresh){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "MSG" && item.ItemId == messageId) {
                // Found
                item.Delivered = { state : true, eventTime: utcDateNow()};
                return false;
            }
        });
        localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

        if(refresh) RefreshStream(buddyObj);
    }
}
function MarkDisplayReceipt(buddyObj, messageId, refresh){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "MSG" && item.ItemId == messageId) {
                // Found
                item.Displayed = { state : true, eventTime: utcDateNow()};
                return false;
            }
        });
        localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

        if(refresh) RefreshStream(buddyObj);
    }
}
function MarkMessageRead(buddyObj, messageId){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream != null || currentStream.DataCollection != null){
        $.each(currentStream.DataCollection, function (i, item) {
            if (item.ItemType == "MSG" && item.ItemId == messageId) {
                // Found
                item.Read = { state : true, eventTime: utcDateNow()};
                // return false; /// Mark all messages matching that id to avoid 
                // duplicate id issue
            }
        });
        localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));
        console.log("Set message ("+ messageId +") as Read");
    }
}

function ReceiveOutOfDialogMessage(message) {
    var callerID = message.request.from.displayName;
    var did = message.request.from.uri.normal.user;

    // Out of dialog Message Receiver
    var messageType = (message.request.headers["Content-Type"].length >=1)? message.request.headers["Content-Type"][0].parsed : "Unknown" ;
    // Text Messages
    if(messageType.indexOf("text/plain") > -1){
        // Plain Text Messages SIP SIMPLE
        console.log("New Incoming Message!", "\""+ callerID +"\" <"+ did +">");

        if(did.length > DidLength) {
            // Contacts cannot receive Test Messages, because they cannot reply
            // This may change with FAX, Email, WhatsApp etc
            console.warn("DID length greater then extensions length")
            return;
        }

        var CurrentCalls = countSessions("0");

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
                jid: null,
                DisplayName: callerID,
                Description: "", 
                Email: "",
                MemberCount: 0,
                EnableDuringDnd: false,
                Subscribe: false
            });
            buddyObj = new Buddy("extension", id, callerID, did, "", "", "", dateNow, "", "", jid, false, false);
            
            // Add memory object
            AddBuddy(buddyObj, true, (CurrentCalls==0), false, tue);

            // Update Size: 
            json.TotalRows = json.DataCollection.length;

            // Save To DB
            localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
        }

        var originalMessage = message.request.body;
        var messageId = uID();
        var DateTime = utcDateNow();

        message.accept();

        AddMessageToStream(buddyObj, messageId, "MSG", originalMessage, DateTime)
        UpdateBuddyActivity(buddyObj.identity);
        RefreshStream(buddyObj);
        ActivateStream(buddyObj, originalMessage);
    }
    // Message Summary
    else if(messageType.indexOf("application/simple-message-summary") > -1){
        console.warn("This message-summary is unsolicited (out-of-dialog). Consider using the SUBSCRIBE method.")
        VoicemailNotify(message);
    }
    else{
        console.warn("Unknown Out Of Dialog Message Type: ", messageType);
        message.reject();
    }
    // Custom Web hook
    if(typeof web_hook_on_message !== 'undefined') web_hook_on_message(message);
}
function AddMessageToStream(buddyObj, messageId, type, message, DateTime){
    var currentStream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(currentStream == null) currentStream = InitialiseStream(buddyObj.identity);

    // Add New Message
    var newMessageJson = {
        ItemId: messageId,
        ItemType: type,
        ItemDate: DateTime,
        SrcUserId: buddyObj.identity,
        Src: "\""+ buddyObj.CallerIDName +"\"",
        DstUserId: profileUserID,
        Dst: "",
        MessageData: message
    }

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(currentStream));

    // Data Cleanup
    if(MaxDataStoreDays && MaxDataStoreDays > 0){
        console.log("Cleaning up data: ", MaxDataStoreDays);
        RemoveBuddyMessageStream(FindBuddyByIdentity(buddy), MaxDataStoreDays);
    }
}
function ActivateStream(buddyObj, message){
    // Handle Stream Not visible
    // =========================
    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
    if (!streamVisible) {
        // Add or Increase the Badge
        IncreaseMissedBadge(buddyObj.identity);
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                var imageUrl = getPicture(buddyObj.identity);
                var noticeOptions = { body: message.substring(0, 250), icon: imageUrl }
                var inComingChatNotification = new Notification(lang.message_from + " : " + buddyObj.CallerIDName, noticeOptions);
                inComingChatNotification.onclick = function (event) {
                    // Show Message
                    SelectBuddy(buddyObj.identity);
                }
            }
        }
        // Play Alert
        console.log("Audio:", audioBlobs.Alert.url);
        var ringer = new Audio(audioBlobs.Alert.blob);
        ringer.preload = "auto";
        ringer.loop = false;
        ringer.oncanplaythrough = function(e) {
            if (typeof ringer.sinkId !== 'undefined' && getRingerOutputID() != "default") {
                ringer.setSinkId(getRingerOutputID()).then(function() {
                    console.log("Set sinkId to:", getRingerOutputID());
                }).catch(function(e){
                    console.warn("Failed not apply setSinkId.", e);
                });
            }
            // If there has been no interaction with the page at all... this page will not work
            ringer.play().then(function(){
                // Audio Is Playing
            }).catch(function(e){
                console.warn("Unable to play audio file.", e);
            });
        }
        // message.data.ringerObj = ringer;
    } else {
        // Message window is active.
    }
}
function AddCallMessage(buddy, session) {

    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
    if(currentStream == null) currentStream = InitialiseStream(buddy);

    var CallEnd = moment.utc(); // Take Now as the Hangup Time
    var callDuration = 0;
    var totalDuration = 0;
    var ringTime = 0;

    var CallStart = moment.utc(session.data.callstart.replace(" UTC", "")); // Actual start (both inbound and outbound)
    var CallAnswer = null; // On Accept when inbound, Remote Side when Outbound
    if(session.data.startTime){
        // The time when WE answered the call (May be null - no answer)
        // or
        // The time when THEY answered the call (May be null - no answer)
        CallAnswer = moment.utc(session.data.startTime);  // Local Time gets converted to UTC 

        callDuration = moment.duration(CallEnd.diff(CallAnswer));
        ringTime = moment.duration(CallAnswer.diff(CallStart));
    } 
    else {
        // There was no start time, but on inbound/outbound calls, this would indicate the ring time
        ringTime = moment.duration(CallEnd.diff(CallStart));
    }
    totalDuration = moment.duration(CallEnd.diff(CallStart));

    var srcId = "";
    var srcCallerID = "";
    var dstId = ""
    var dstCallerID = "";
    if(session.data.calldirection == "inbound") {
        srcId = buddy;
        dstId = profileUserID;
        srcCallerID = session.remoteIdentity.displayName;
        dstCallerID = profileName;
    } else if(session.data.calldirection == "outbound") {
        srcId = profileUserID;
        dstId = buddy;
        srcCallerID = profileName;
        dstCallerID = session.data.dst;
    }

    var callDirection = session.data.calldirection;
    var withVideo = session.data.withvideo;
    var sessionId = session.id;
    var hangupBy = session.data.terminateby;

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
        ReasonCode: session.data.reasonCode,
        ReasonText: session.data.reasonText,
        WithVideo: withVideo,
        SessionId: sessionId,
        CallDirection: callDirection,
        Terminate: hangupBy,
        // CRM
        MessageData: null,
        Tags: [],
        //Reporting
        Transfers: (session.data.transfer)? session.data.transfer : [],
        Mutes: (session.data.mute)? session.data.mute : [],
        Holds: (session.data.hold)? session.data.hold : [],
        Recordings: (session.data.recordings)? session.data.recordings : [],
        ConfCalls: (session.data.confcalls)? session.data.confcalls : [],
        ConfbridgeEvents: (session.data.ConfbridgeEvents)? session.data.ConfbridgeEvents : [],
        QOS: []
    }

    console.log("New CDR", newMessageJson);

    currentStream.DataCollection.push(newMessageJson);
    currentStream.TotalRows = currentStream.DataCollection.length;
    localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));

    UpdateBuddyActivity(buddy);

    // Data Cleanup
    if(MaxDataStoreDays && MaxDataStoreDays > 0){
        console.log("Cleaning up data: ", MaxDataStoreDays);
        RemoveBuddyMessageStream(FindBuddyByIdentity(buddy), MaxDataStoreDays);
    }

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
        + "</td></tr></table>";
    $("#contact-" + buddy + "-ChatHistory").append(messageString);
    updateScroll(buddy);

    ImageEditor_Cancel(buddy);

    // Update Last Activity
    // ====================
    UpdateBuddyActivity(buddy);
}
function updateLineScroll(lineNum) {
    RefreshLineActivity(lineNum);

    var element = $("#line-"+ lineNum +"-CallDetails").get(0);
    if(element) element.scrollTop = element.scrollHeight;
}
function updateScroll(buddy) {
    var history = $("#contact-"+ buddy +"-ChatHistory");
    try{
        if(history.children().length > 0) history.children().last().get(0).scrollIntoView(false);
        history.get(0).scrollTop = history.get(0).scrollHeight;
    } catch(e){}
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

    // Custom Web hook
    if(typeof web_hook_on_missed_notify !== 'undefined') web_hook_on_missed_notify(buddyObj.missed);

    console.log("Set Missed badge for "+ buddyObj.CallerIDName +" to: "+ buddyObj.missed);
}
function UpdateBuddyActivity(buddy, lastAct){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    // Update Last Activity Time
    // =========================
    if(lastAct){
        buddyObj.lastActivity = lastAct;
    } 
    else {
        var timeStamp = utcDateNow();
        buddyObj.lastActivity = timeStamp;
    }
    console.log("Last Activity for "+  buddyObj.CallerIDName +" is now: "+ buddyObj.lastActivity);

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

    if(typeof web_hook_on_missed_notify !== 'undefined') web_hook_on_missed_notify(buddyObj.missed);
}

// Outbound Calling
// ================
function VideoCall(lineObj, dialledNumber, extraHeaders) {
    if(userAgent == null) return;
    if(!userAgent.isRegistered()) return;
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

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var spdOptions = {
        earlyMedia: true,
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: { deviceId : "default" },
                video: { deviceId : "default" }
            }
        }
    }

    // Configure Audio
    var currentAudioDevice = getAudioSrcID();
    if(currentAudioDevice != "default"){
        var confirmedAudioDevice = false;
        for (var i = 0; i < AudioinputDevices.length; ++i) {
            if(currentAudioDevice == AudioinputDevices[i].deviceId) {
                confirmedAudioDevice = true;
                break;
            }
        }
        if(confirmedAudioDevice) {
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: currentAudioDevice }
        }
        else {
            console.warn("The audio device you used before is no longer available, default settings applied.");
            localDB.setItem("AudioSrcId", "default");
        }
    }
    // Add additional Constraints
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
    if(currentVideoDevice != "default"){
        var confirmedVideoDevice = false;
        for (var i = 0; i < VideoinputDevices.length; ++i) {
            if(currentVideoDevice == VideoinputDevices[i].deviceId) {
                confirmedVideoDevice = true;
                break;
            }
        }
        if(confirmedVideoDevice){
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = { exact: currentVideoDevice }
        }
        else {
            console.warn("The video device you used before is no longer available, default settings applied.");
            localDB.setItem("VideoSrcId", "default"); // resets for later and subsequent calls
        }
    }
    // Add additional Constraints
    if(supportedConstraints.frameRate && maxFrameRate != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
    }
    if(supportedConstraints.height && videoHeight != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
    }
    if(supportedConstraints.aspectRatio && videoAspectRatio != "") {
        spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
    }
    // Extra Headers
    if(extraHeaders) {
        spdOptions.extraHeaders = extraHeaders;
    } else {
        spdOptions.extraHeaders = [];
    }
    if(InviteExtraHeaders && InviteExtraHeaders != "" && InviteExtraHeaders != "{}"){
        try{
            var inviteExtraHeaders = JSON.parse(InviteExtraHeaders);
            for (const [key, value] of Object.entries(inviteExtraHeaders)) {
                if(value == ""){
                    // This is a header, must be format: "Field: Value"
                } else {
                    spdOptions.extraHeaders.push(key + ": "+  value);
                }
            }
        } catch(e){}
    }

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.starting_video_call);
    $("#line-" + lineObj.LineNumber + "-timer").show();

    var startTime = moment.utc();

    // Invite
    console.log("INVITE (video): " + dialledNumber + "@" + SipDomain); 

    var targetURI = SIP.UserAgent.makeURI("sip:" + dialledNumber.replace(/#/g, "%23") + "@" + SipDomain);
    lineObj.SipSession = new SIP.Inviter(userAgent, targetURI, spdOptions);
    lineObj.SipSession.data = {}
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    lineObj.SipSession.data.calldirection = "outbound";
    lineObj.SipSession.data.dst = dialledNumber;
    lineObj.SipSession.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    lineObj.SipSession.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime)); 
        var timeStr = formatShortDuration(duration.asSeconds());
        $("#line-" + lineObj.LineNumber + "-timer").html(timeStr);
        $("#line-" + lineObj.LineNumber + "-datetime").html(timeStr);
    }, 1000);
    lineObj.SipSession.data.VideoSourceDevice = getVideoSrcID();
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();
    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.withvideo = true;
    lineObj.SipSession.data.earlyReject = false;
    lineObj.SipSession.isOnHold = false;
    lineObj.SipSession.delegate = {
        onBye: function(sip){
            onSessionReceivedBye(lineObj, sip);
        },
        onMessage: function(sip){
            onSessionReceivedMessage(lineObj, sip);
        },
        onInvite: function(sip){
            onSessionReinvited(lineObj, sip);
        },
        onSessionDescriptionHandler: function(sdh, provisional){
            onSessionDescriptionHandlerCreated(lineObj, sdh, provisional, true);
        }
    }
    var inviterOptions = {
        requestDelegate: { // OutgoingRequestDelegate
            onTrying: function(sip){
                onInviteTrying(lineObj, sip);
            },
            onProgress:function(sip){
                onInviteProgress(lineObj, sip);
            },
            onRedirect:function(sip){
                onInviteRedirected(lineObj, sip);
            },
            onAccept:function(sip){
                onInviteAccepted(lineObj, true, sip);
            },
            onReject:function(sip){
                onInviteRejected(lineObj, sip);
            }
        }
    }
    lineObj.SipSession.invite(inviterOptions).catch(function(e){
        console.warn("Failed to send INVITE:", e);
    });

    $("#line-" + lineObj.LineNumber + "-btn-settings").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-audioCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-videoCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-search").removeAttr('disabled');

    $("#line-" + lineObj.LineNumber + "-progress").show();
    $("#line-" + lineObj.LineNumber + "-msg").show();

    UpdateUI();
    UpdateBuddyList();
    updateLineScroll(lineObj.LineNumber);

    // Custom Web hook
    if(typeof web_hook_on_invite !== 'undefined') web_hook_on_invite(lineObj.SipSession);
}
function AudioCallMenu(buddy, obj){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    var items = [];
    if(buddyObj.type == "extension" || buddyObj.type == "xmpp") {
        items.push({icon: "fa fa-phone-square", text: lang.call_extension + " ("+ buddyObj.ExtNo +")", value: buddyObj.ExtNo});
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") {
            items.push({icon: "fa fa-mobile", text: lang.call_mobile + " ("+ buddyObj.MobileNumber +")", value: buddyObj.MobileNumber});
        }
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") {
            items.push({icon: "fa fa-phone", text: lang.call_number + " ("+ buddyObj.ContactNumber1 +")", value: buddyObj.ContactNumber1});
        }
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") {
            items.push({icon: "fa fa-phone", text: lang.call_number + " ("+ buddyObj.ContactNumber2 +")", value: buddyObj.ContactNumber2});
        }
    }
    else if(buddyObj.type == "contact") {
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") {
            items.push({icon: "fa fa-mobile", text: lang.call_mobile + " ("+ buddyObj.MobileNumber +")", value: buddyObj.MobileNumber});
        }
        if(buddyObj.ContactNumber1 != null && buddyObj.ContactNumber1 != "") {
            items.push({icon: "fa fa-phone", text: lang.call_number + " ("+ buddyObj.ContactNumber1 +")", value: buddyObj.ContactNumber1});
        }
        if(buddyObj.ContactNumber2 != null && buddyObj.ContactNumber2 != "") {
            items.push({icon: "fa fa-phone", text: lang.call_number + " ("+ buddyObj.ContactNumber2 +")", value: buddyObj.ContactNumber2});
        }
    }
    else if(buddyObj.type == "group") {
        if(buddyObj.MobileNumber != null && buddyObj.MobileNumber != "") {
            items.push({icon: "fa fa-users", text: lang.call_group, value: buddyObj.ExtNo });
        }
    }
    if(items.length == 0) {
        console.error("No numbers to dial");
        EditBuddyWindow(buddy);
        return;
    }
    if(items.length == 1) {
        // only one number provided, call it
        console.log("Automatically calling only number - AudioCall("+ buddy +", "+ items[0].value +")");

        DialByLine("audio", buddy, items[0].value);
    }
    else {
        // Show numbers to dial

        var menu = {
            selectEvent : function( event, ui ) {
                var number = ui.item.attr("value");
                HidePopup();
                if(number != null) {
                    console.log("Menu click AudioCall("+ buddy +", "+ number +")");
                    DialByLine("audio", buddy, number);
                }
            },
            createEvent : null,
            autoFocus : true,
            items : items
        }
        PopupMenu(obj, menu);
    }
}
function AudioCall(lineObj, dialledNumber, extraHeaders) {
    if(userAgent == null) return;
    if(userAgent.isRegistered() == false) return;
    if(lineObj == null) return;

    if(HasAudioDevice == false){
        Alert(lang.alert_no_microphone);
        return;
    }

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();

    var spdOptions = {
        earlyMedia: true,
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: { deviceId : "default" },
                video: false
            }
        }
    }
    // Configure Audio
    var currentAudioDevice = getAudioSrcID();
    if(currentAudioDevice != "default"){
        var confirmedAudioDevice = false;
        for (var i = 0; i < AudioinputDevices.length; ++i) {
            if(currentAudioDevice == AudioinputDevices[i].deviceId) {
                confirmedAudioDevice = true;
                break;
            }
        }
        if(confirmedAudioDevice) {
            spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: currentAudioDevice }
        }
        else {
            console.warn("The audio device you used before is no longer available, default settings applied.");
            localDB.setItem("AudioSrcId", "default");
        }
    }
    // Add additional Constraints
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }
    // Added to the SIP Headers
    if(extraHeaders) {
        spdOptions.extraHeaders = extraHeaders;
    } else {
        spdOptions.extraHeaders = [];
    }
    if(InviteExtraHeaders && InviteExtraHeaders != "" && InviteExtraHeaders != "{}"){
        try{
            var inviteExtraHeaders = JSON.parse(InviteExtraHeaders);
            for (const [key, value] of Object.entries(inviteExtraHeaders)) {
                if(value == ""){
                    // This is a header, must be format: "Field: Value"
                } else {
                    spdOptions.extraHeaders.push(key + ": "+  value);
                }
            }
        } catch(e){}
    }

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.starting_audio_call);
    $("#line-" + lineObj.LineNumber + "-timer").show();

    var startTime = moment.utc();

    // Invite
    console.log("INVITE (audio): " + dialledNumber + "@" + SipDomain);

    var targetURI = SIP.UserAgent.makeURI("sip:" + dialledNumber.replace(/#/g, "%23") + "@" + SipDomain);
    lineObj.SipSession = new SIP.Inviter(userAgent, targetURI, spdOptions);
    lineObj.SipSession.data = {}
    lineObj.SipSession.data.line = lineObj.LineNumber;
    lineObj.SipSession.data.buddyId = lineObj.BuddyObj.identity;
    lineObj.SipSession.data.calldirection = "outbound";
    lineObj.SipSession.data.dst = dialledNumber;
    lineObj.SipSession.data.callstart = startTime.format("YYYY-MM-DD HH:mm:ss UTC");
    lineObj.SipSession.data.callTimer = window.setInterval(function(){
        var now = moment.utc();
        var duration = moment.duration(now.diff(startTime)); 
        var timeStr = formatShortDuration(duration.asSeconds());
        $("#line-" + lineObj.LineNumber + "-timer").html(timeStr);
        $("#line-" + lineObj.LineNumber + "-datetime").html(timeStr);
    }, 1000);
    lineObj.SipSession.data.VideoSourceDevice = null;
    lineObj.SipSession.data.AudioSourceDevice = getAudioSrcID();
    lineObj.SipSession.data.AudioOutputDevice = getAudioOutputID();
    lineObj.SipSession.data.terminateby = "them";
    lineObj.SipSession.data.withvideo = false;
    lineObj.SipSession.data.earlyReject = false;
    lineObj.SipSession.isOnHold = false;
    lineObj.SipSession.delegate = {
        onBye: function(sip){
            onSessionReceivedBye(lineObj, sip);
        },
        onMessage: function(sip){
            onSessionReceivedMessage(lineObj, sip);
        },
        onInvite: function(sip){
            onSessionReinvited(lineObj, sip);
        },
        onSessionDescriptionHandler: function(sdh, provisional){
            onSessionDescriptionHandlerCreated(lineObj, sdh, provisional, false);
        }
    }
    var inviterOptions = {
        requestDelegate: { // OutgoingRequestDelegate
            onTrying: function(sip){
                onInviteTrying(lineObj, sip);
            },
            onProgress:function(sip){
                onInviteProgress(lineObj, sip);
            },
            onRedirect:function(sip){
                onInviteRedirected(lineObj, sip);
            },
            onAccept:function(sip){
                onInviteAccepted(lineObj, false, sip);
            },
            onReject:function(sip){
                onInviteRejected(lineObj, sip);
            }
        }
    }
    lineObj.SipSession.invite(inviterOptions).catch(function(e){
        console.warn("Failed to send INVITE:", e);
    });

    $("#line-" + lineObj.LineNumber + "-btn-settings").removeAttr('disabled');
    $("#line-" + lineObj.LineNumber + "-btn-audioCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-videoCall").prop('disabled','disabled');
    $("#line-" + lineObj.LineNumber + "-btn-search").removeAttr('disabled');

    $("#line-" + lineObj.LineNumber + "-progress").show();
    $("#line-" + lineObj.LineNumber + "-msg").show();

    UpdateUI();
    UpdateBuddyList();
    updateLineScroll(lineObj.LineNumber);

    // Custom Web hook
    if(typeof web_hook_on_invite !== 'undefined') web_hook_on_invite(lineObj.SipSession);    
}

// Sessions & During Call Activity
// ===============================
function getSession(buddy) {
    if(userAgent == null) {
        console.warn("userAgent is null");
        return null;
    }
    if(userAgent.isRegistered() == false) {
        console.warn("userAgent is not registered");
        return null;
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
function countSessions(id){
    var rtn = 0;
    if(userAgent == null) {
        console.warn("userAgent is null");
        return 0;
    }
    $.each(userAgent.sessions, function (i, session) {
        if(id != session.id) rtn ++;
    });
    return rtn;
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

    if(session.data.mediaRecorder && session.data.mediaRecorder.state == "recording"){
        console.warn("Call Recording was somehow on... stopping call recording");
        StopRecording(lineNum, true);
        // State should be inactive now, but the data available event will fire
        // Note: potential race condition here if someone hits the stop, and start quite quickly.
    }
    console.log("Creating call recorder...");

    session.data.recordingAudioStreams = new MediaStream();
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
            console.log("Adding sender audio track to record:", RTCRtpSender.track.label);
            session.data.recordingAudioStreams.addTrack(RTCRtpSender.track);
        }
    });
    pc.getReceivers().forEach(function (RTCRtpReceiver) {
        if(RTCRtpReceiver.track && RTCRtpReceiver.track.kind == "audio") {
            console.log("Adding receiver audio track to record:", RTCRtpReceiver.track.label);
            session.data.recordingAudioStreams.addTrack(RTCRtpReceiver.track);
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
        // Create Canvas
        session.data.recordingCanvas = $('<canvas/>').get(0);
        session.data.recordingCanvas.width = (RecordingLayout == "side-by-side")? (recordingWidth * 2) + 5: recordingWidth;
        session.data.recordingCanvas.height = recordingHeight;
        session.data.recordingContext = session.data.recordingCanvas.getContext("2d");

        // Capture Interval
        window.clearInterval(session.data.recordingRedrawInterval);
        session.data.recordingRedrawInterval = window.setInterval(function(){

            // Video Source
            var pnpVideo = $("#line-" + lineObj.LineNumber + "-localVideo").get(0);

            var mainVideo = null;
            var validVideos = [];
            var talkingVideos = [];
            var videoContainer = $("#line-" + lineObj.LineNumber + "-remote-videos");
            var potentialVideos =  videoContainer.find('video').length;
            if(potentialVideos == 0){
                // Nothing to render
                // console.log("Nothing to render in this frame")
            }
            else if (potentialVideos == 1){
                mainVideo = videoContainer.find('video')[0];
                // console.log("Only one video element", mainVideo);
            }
            else if (potentialVideos > 1){
                // Decide what video to record
                videoContainer.find('video').each(function(i, video) {
                    var videoTrack = video.srcObject.getVideoTracks()[0];
                    if(videoTrack.readyState == "live" && video.videoWidth > 10 && video.videoHeight >= 10) {
                        if(video.srcObject.isPinned == true){
                            mainVideo = video;
                            // console.log("Multiple Videos using last PINNED frame");
                        }
                        if(video.srcObject.isTalking == true){
                            talkingVideos.push(video);
                        }
                        validVideos.push(video);
                    }
                });

                // Check if we found something
                if(mainVideo == null && talkingVideos.length >= 1){
                    // Nothing pinned use talking
                    mainVideo = talkingVideos[0];
                    // console.log("Multiple Videos using first talking frame");
                }
                if(mainVideo == null && validVideos.length >= 1){
                    // Nothing pinned or talking use valid
                    mainVideo = validVideos[0];
                    // console.log("Multiple Videos using first VALID frame");
                }
            }

            // Main Video
            var videoWidth = (mainVideo && mainVideo.videoWidth > 0)? mainVideo.videoWidth : recordingWidth ;
            var videoHeight = (mainVideo && mainVideo.videoHeight > 0)? mainVideo.videoHeight : recordingHeight ;
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

            // Draw Background
            session.data.recordingContext.fillRect(0, 0, session.data.recordingCanvas.width, session.data.recordingCanvas.height);

            // Draw Main Video
            if(mainVideo && mainVideo.videoHeight > 0){
                session.data.recordingContext.drawImage(mainVideo, offsetX, offsetY, videoWidth, videoHeight);
            }

            // Draw PnP
            if(pnpVideo.videoHeight > 0 && (RecordingLayout == "side-by-side" || RecordingLayout == "them-pnp")){
                // Only Draw the Pnp Video when needed
                session.data.recordingContext.drawImage(pnpVideo, pnpOffsetX, pnpOffsetY, pnpVideoWidth, pnpVideoHeight);
            }
        }, Math.floor(1000/RecordingVideoFps));

        // Start Video Capture
        session.data.recordingVideoMediaStream = session.data.recordingCanvas.captureStream(RecordingVideoFps);
    }

    session.data.recordingMixedAudioVideoRecordStream = new MediaStream();
    session.data.recordingMixedAudioVideoRecordStream.addTrack(MixAudioStreams(session.data.recordingAudioStreams).getAudioTracks()[0]);
    if(session.data.withvideo){
        session.data.recordingMixedAudioVideoRecordStream.addTrack(session.data.recordingVideoMediaStream.getVideoTracks()[0]);
    }

    var mediaType = "audio/webm"; // audio/mp4 | audio/webm;
    if(session.data.withvideo) mediaType = "video/webm";
    var options = {
        mimeType : mediaType
    }
    // Note: It appears that mimeType is optional, but... Safari is truly dreadful at recording in mp4, and doesn't have webm yet
    // You you can leave this as default, or force webm, however know that Safari will be no good at this either way.
    // session.data.mediaRecorder = new MediaRecorder(session.data.recordingMixedAudioVideoRecordStream, options);
    session.data.mediaRecorder = new MediaRecorder(session.data.recordingMixedAudioVideoRecordStream);
    session.data.mediaRecorder.data = {}
    session.data.mediaRecorder.data.id = ""+ id;
    session.data.mediaRecorder.data.sessionId = ""+ session.id;
    session.data.mediaRecorder.data.buddyId = ""+ lineObj.BuddyObj.identity;
    session.data.mediaRecorder.ondataavailable = function(event) {
        console.log("Got Call Recording Data: ", event.data.size +"Bytes", this.data.id, this.data.buddyId, this.data.sessionId);
        // Save the Audio/Video file
        SaveCallRecording(event.data, this.data.id, this.data.buddyId, this.data.sessionId);
    }

    console.log("Starting Call Recording", id);
    session.data.mediaRecorder.start(); // Safari does not support time slice
    session.data.recordings[session.data.recordings.length-1].startTime = utcDateNow();

    $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_started);

    updateLineScroll(lineNum);
}
function SaveCallRecording(blob, id, buddy, sessionid){
    if(CallRecordingsIndexDb != null){
        
        // Prepare data to write
        var data = {
            uID: id,
            sessionid: sessionid,
            bytes: blob.size,
            type: blob.type,
            mediaBlob: blob
        }
        // Commit Transaction
        var transaction = CallRecordingsIndexDb.transaction(["Recordings"], "readwrite");
        var objectStoreAdd = transaction.objectStore("Recordings").add(data);
        objectStoreAdd.onsuccess = function(event) {
            console.log("Call Recording Success: ", id, blob.size, blob.type, buddy, sessionid);
        }
    }
    else {
        console.warn("CallRecordingsIndexDb is null.");
    }
}
function StopRecording(lineNum, noConfirm){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    var session = lineObj.SipSession;
    if(noConfirm == true){
        // Called at the end of a call
        $("#line-"+ lineObj.LineNumber +"-btn-start-recording").show();
        $("#line-"+ lineObj.LineNumber +"-btn-stop-recording").hide();

        if(session.data.mediaRecorder){
            if(session.data.mediaRecorder.state == "recording"){
                console.log("Stopping Call Recording");
                session.data.mediaRecorder.stop();
                session.data.recordings[session.data.recordings.length-1].stopTime = utcDateNow();
                window.clearInterval(session.data.recordingRedrawInterval);

                $("#line-" + lineObj.LineNumber + "-msg").html(lang.call_recording_stopped);

                updateLineScroll(lineNum);
            } 
            else{
                console.warn("Recorder is in an unknown state");
            }
        }
        return;
    }
    else {
        // User attempts to end call recording
        if(CallRecordingPolicy == "enabled"){
            console.warn("Policy Enabled: Call Recording");
            return;
        }

        Confirm(lang.confirm_stop_recording, lang.stop_recording, function(){
            StopRecording(lineNum, true);
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

    if(CallRecordingsIndexDb != null){
        var transaction = CallRecordingsIndexDb.transaction(["Recordings"]);
        var objectStoreGet = transaction.objectStore("Recordings").get(uID);
        objectStoreGet.onerror = function(event) {
            console.error("IndexDB Get Error:", event);
        }
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
    else {
        console.warn("CallRecordingsIndexDb is null.");
    }
}
function PlayVideoCallRecording(obj, cdrId, uID, buddy){
    var container = $(obj).parent();
    container.empty();

    var videoObj = $("<video>").get(0);
    videoObj.id = "callrecording-video-"+ cdrId;
    videoObj.autoplay = false;
    videoObj.controls = true;
    videoObj.playsinline = true;
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

    if(CallRecordingsIndexDb != null){
        var transaction = CallRecordingsIndexDb.transaction(["Recordings"]);
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
                try{
                    videoObj.scrollIntoViewIfNeeded(false);
                } catch(e){}
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
    else {
        console.warn("CallRecordingsIndexDb is null.");
    }
}

// Stream Manipulations
// ====================
function MixAudioStreams(MultiAudioTackStream){
    // Takes in a MediaStream with any number of audio tracks and mixes them together

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
    var filter = obj.value;
    if(filter == "") {
        HidePopup();
        return;
    }

    console.log("Find Buddy: ", filter);

    Buddies.sort(function(a, b){
        if(a.CallerIDName < b.CallerIDName) return -1;
        if(a.CallerIDName > b.CallerIDName) return 1;
        return 0;
    });

    var items = [];
    var visibleItems = 0;
    for(var b = 0; b < Buddies.length; b++){
        var buddyObj = Buddies[b];

        // Perform Filter Display
        var display = false;
        if(buddyObj.CallerIDName && buddyObj.CallerIDName.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ExtNo && buddyObj.ExtNo.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.Desc && buddyObj.Desc.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.MobileNumber && buddyObj.MobileNumber.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ContactNumber1 && buddyObj.ContactNumber1.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(buddyObj.ContactNumber2 && buddyObj.ContactNumber2.toLowerCase().indexOf(filter.toLowerCase()) > -1) display = true;
        if(display) {
            // Filtered Results
            var iconClass = "dotDefault";
            if(buddyObj.type == "extension" && buddyObj.EnableSubscribe == true) {
                iconClass = buddyObj.devState;
            } else if(buddyObj.type == "xmpp" && buddyObj.EnableSubscribe == true) {
                iconClass = buddyObj.devState;
            }
            if(visibleItems > 0) items.push({ value: null, text: "-"});
            items.push({ value: null, text: buddyObj.CallerIDName, isHeader: true });
            if(buddyObj.ExtNo != "") {
                items.push({ icon : "fa fa-phone-square "+ iconClass, text: lang.extension +" ("+ buddyObj.presence +"): "+ buddyObj.ExtNo, value: buddyObj.ExtNo });
            }
            if(buddyObj.MobileNumber != "") {
                items.push({ icon : "fa fa-mobile", text: lang.mobile +": "+ buddyObj.MobileNumber, value: buddyObj.MobileNumber });
            }
            if(buddyObj.ContactNumber1 != "") {
                items.push({ icon : "fa fa-phone", text: lang.call +": "+ buddyObj.ContactNumber1, value: buddyObj.ContactNumber1 });
            }
            if(buddyObj.ContactNumber2 != "") {
                items.push({ icon : "fa fa-phone", text: lang.call +": "+ buddyObj.ContactNumber2, value: buddyObj.ContactNumber2 });
            }
            visibleItems++;
        }
        if(visibleItems >= 5) break;
    }

    if(items.length > 1){
        var menu = {
            selectEvent : function( event, ui ) {
                var number = ui.item.attr("value");
                if(number == null) HidePopup();
                if(number != "null" && number != "" && number != undefined) {
                    HidePopup();
                    obj.value = number;
                }
            },
            createEvent : null,
            autoFocus : false,
            items : items
        }
        PopupMenu(obj, menu);
    } 
    else {
        HidePopup();
    }
}

// Call Transfer
// =============
function StartTransferSession(lineNum){
    if($("#line-"+ lineNum +"-btn-CancelConference").is(":visible")){
        CancelConference(lineNum);
        return;
    }

    $("#line-"+ lineNum +"-btn-Transfer").hide();
    $("#line-"+ lineNum +"-btn-CancelTransfer").show();

    holdSession(lineNum);
    $("#line-"+ lineNum +"-txt-FindTransferBuddy").val("");
    $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();

    $("#line-"+ lineNum +"-session-avatar").css("width", "50px");
    $("#line-"+ lineNum +"-session-avatar").css("height", "50px");
    RestoreCallControls(lineNum)

    $("#line-"+ lineNum +"-btn-blind-transfer").show();
    $("#line-"+ lineNum +"-btn-attended-transfer").show();
    $("#line-"+ lineNum +"-btn-complete-transfer").hide();
    $("#line-"+ lineNum +"-btn-cancel-transfer").hide();

    $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
    $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
    $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();

    $("#line-"+ lineNum +"-transfer-status").hide();

    $("#line-"+ lineNum +"-Transfer").show();

    updateLineScroll(lineNum);
}
function CancelTransferSession(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;
    if(session.data.childsession){
        console.log("Child Transfer call detected:", session.data.childsession.state);
        session.data.childsession.dispose().then(function(){
            session.data.childsession = null;
        }).catch(function(error){
            session.data.childsession = null;
            // Suppress message
        });
    }

    $("#line-"+ lineNum +"-session-avatar").css("width", "");
    $("#line-"+ lineNum +"-session-avatar").css("height", "");

    $("#line-"+ lineNum +"-btn-Transfer").show();
    $("#line-"+ lineNum +"-btn-CancelTransfer").hide();

    unholdSession(lineNum);
    $("#line-"+ lineNum +"-Transfer").hide();

    updateLineScroll(lineNum);
}
function transferOnkeydown(event, obj, lineNum) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13'){
        event.preventDefault();
        if(event.ctrlKey){
            AttendedTransfer(lineNum);
        }
        else {
            BlindTransfer(lineNum);
        }

        return false;
    }
}
function BlindTransfer(lineNum) {
    var dstNo = $("#line-"+ lineNum +"-txt-FindTransferBuddy").val();
    if(EnableAlphanumericDial){
        dstNo = dstNo.replace(telAlphanumericRegEx, "").substring(0,MaxDidLength);
    }
    else {
        dstNo = dstNo.replace(telNumericRegEx, "").substring(0,MaxDidLength);
    }
    if(dstNo == ""){
        console.warn("Cannot transfer, no number");
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
    var transferId = session.data.transfer.length-1;

    var transferOptions  = { 
        requestDelegate: {
            onAccept: function(sip){
                console.log("Blind transfer Accepted");

                session.data.terminateby = "us";
                session.data.reasonCode = 202;
                session.data.reasonText = "Transfer";
            
                session.data.transfer[transferId].accept.complete = true;
                session.data.transfer[transferId].accept.disposition = sip.message.reasonPhrase;
                session.data.transfer[transferId].accept.eventTime = utcDateNow();

                // TODO: use lang pack
                $("#line-" + lineNum + "-msg").html("Call Blind Transferred (Accepted)");

                updateLineScroll(lineNum);

                session.bye().catch(function(error){
                    console.warn("Could not BYE after blind transfer:", error);
                });
                teardownSession(lineObj);
            },
            onReject:function(sip){
                console.warn("REFER rejected:", sip);

                session.data.transfer[transferId].accept.complete = false;
                session.data.transfer[transferId].accept.disposition = sip.message.reasonPhrase;
                session.data.transfer[transferId].accept.eventTime = utcDateNow();

                $("#line-" + lineNum + "-msg").html("Call Blind Failed!");

                updateLineScroll(lineNum);

                // Session should still be up, so just allow them to try again
            }
        }
    }
    console.log("REFER: ", dstNo + "@" + SipDomain);
    var referTo = SIP.UserAgent.makeURI("sip:"+ dstNo.replace(/#/g, "%23") + "@" + SipDomain);
    session.refer(referTo, transferOptions).catch(function(error){
        console.warn("Failed to REFER", error);
    });;

    $("#line-" + lineNum + "-msg").html(lang.call_blind_transfered);

    updateLineScroll(lineNum);
}
function AttendedTransfer(lineNum){
    var dstNo = $("#line-"+ lineNum +"-txt-FindTransferBuddy").val();
    if(EnableAlphanumericDial){
        dstNo = dstNo.replace(telAlphanumericRegEx, "").substring(0,MaxDidLength);
    }
    else {
        dstNo = dstNo.replace(telNumericRegEx, "").substring(0,MaxDidLength);
    }
    if(dstNo == ""){
        console.warn("Cannot transfer, no number");
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
    var transferId = session.data.transfer.length-1;

    updateLineScroll(lineNum);

    // SDP options
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var spdOptions = {
        earlyMedia: true,
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: { deviceId : "default" },
                video: false
            }
        }
    }
    if(session.data.AudioSourceDevice != "default"){
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: session.data.AudioSourceDevice }
    }
    // Add additional Constraints
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Not sure if its possible to transfer a Video call???
    if(session.data.withvideo){
        spdOptions.sessionDescriptionHandlerOptions.constraints.video = true;
        if(session.data.VideoSourceDevice != "default"){
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = { exact: session.data.VideoSourceDevice }
        }
        // Add additional Constraints
        if(supportedConstraints.frameRate && maxFrameRate != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
        }
        if(supportedConstraints.height && videoHeight != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
        }
        if(supportedConstraints.aspectRatio && videoAspectRatio != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
        }
    }

    // Create new call session
    console.log("TRANSFER INVITE: ", "sip:" + dstNo + "@" + SipDomain);
    var targetURI = SIP.UserAgent.makeURI("sip:"+ dstNo.replace(/#/g, "%23") + "@" + SipDomain);
    var newSession = new SIP.Inviter(userAgent, targetURI, spdOptions);
    newSession.data = {}
    newSession.delegate = {
        onBye: function(sip){
            console.log("New call session ended with BYE");
            newCallStatus.html(lang.call_ended);
            session.data.transfer[transferId].disposition = "bye";
            session.data.transfer[transferId].dispositionTime = utcDateNow();

            $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();
            $("#line-"+ lineNum +"-btn-blind-transfer").show();
            $("#line-"+ lineNum +"-btn-attended-transfer").show();
    
            $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
            $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
            $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();
    
            $("#line-"+ lineNum +"-msg").html(lang.attended_transfer_call_terminated);
    
            updateLineScroll(lineNum);
    
            window.setTimeout(function(){
                newCallStatus.hide();
                updateLineScroll(lineNum);
            }, 1000);
        },
        onSessionDescriptionHandler: function(sdh, provisional){
            if (sdh) {
                if(sdh.peerConnection){
                    sdh.peerConnection.ontrack = function(event){
                        var pc = sdh.peerConnection;

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

                    }
                }
                else{
                    console.warn("onSessionDescriptionHandler fired without a peerConnection");
                }
            }
            else{
                console.warn("onSessionDescriptionHandler fired without a sessionDescriptionHandler");
            }
        }
    }
    session.data.childsession = newSession;
    var inviterOptions = {
        requestDelegate: {
            onTrying: function(sip){
                newCallStatus.html(lang.trying);
                session.data.transfer[transferId].disposition = "trying";
                session.data.transfer[transferId].dispositionTime = utcDateNow();

                $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_started);
            },
            onProgress:function(sip){
                newCallStatus.html(lang.ringing);
                session.data.transfer[transferId].disposition = "progress";
                session.data.transfer[transferId].dispositionTime = utcDateNow();

                $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_started);

                var CancelAttendedTransferBtn = $("#line-"+ lineNum +"-btn-cancel-attended-transfer");
                CancelAttendedTransferBtn.off('click');
                CancelAttendedTransferBtn.on('click', function(){
                    newSession.cancel().catch(function(error){
                        console.warn("Failed to CANCEL", error);
                    });
                    newCallStatus.html(lang.call_cancelled);
                    console.log("New call session canceled");
        
                    session.data.transfer[transferId].accept.complete = false;
                    session.data.transfer[transferId].accept.disposition = "cancel";
                    session.data.transfer[transferId].accept.eventTime = utcDateNow();
        
                    $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_cancelled);
        
                    updateLineScroll(lineNum);
                });
                CancelAttendedTransferBtn.show();
        
                updateLineScroll(lineNum);
            },
            onRedirect:function(sip){
                console.log("Redirect received:", sip);
            },
            onAccept:function(sip){
                newCallStatus.html(lang.call_in_progress);
                $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
                session.data.transfer[transferId].disposition = "accepted";
                session.data.transfer[transferId].dispositionTime = utcDateNow();
        
                var CompleteTransferBtn = $("#line-"+ lineNum +"-btn-complete-attended-transfer");
                CompleteTransferBtn.off('click');
                CompleteTransferBtn.on('click', function(){
                    var transferOptions  = { 
                        requestDelegate: {
                            onAccept: function(sip){
                                console.log("Attended transfer Accepted");

                                session.data.terminateby = "us";
                                session.data.reasonCode = 202;
                                session.data.reasonText = "Attended Transfer";

                                session.data.transfer[transferId].accept.complete = true;
                                session.data.transfer[transferId].accept.disposition = sip.message.reasonPhrase;
                                session.data.transfer[transferId].accept.eventTime = utcDateNow();

                                $("#line-" + lineNum + "-msg").html(lang.attended_transfer_complete_accepted);

                                updateLineScroll(lineNum);

                                // We must end this session manually
                                session.bye().catch(function(error){
                                    console.warn("Could not BYE after blind transfer:", error);
                                });

                                teardownSession(lineObj);
                            },
                            onReject: function(sip){
                                console.warn("Attended transfer rejected:", sip);

                                session.data.transfer[transferId].accept.complete = false;
                                session.data.transfer[transferId].accept.disposition = sip.message.reasonPhrase;
                                session.data.transfer[transferId].accept.eventTime = utcDateNow();

                                $("#line-" + lineNum + "-msg").html("Attended Transfer Failed!");

                                updateLineScroll(lineNum);
                            }
                        }
                    }
        
                    // Send REFER
                    session.refer(newSession, transferOptions).catch(function(error){
                        console.warn("Failed to REFER", error);
                    });
        
                    newCallStatus.html(lang.attended_transfer_complete);

                    updateLineScroll(lineNum);
                });
                CompleteTransferBtn.show();
        
                updateLineScroll(lineNum);
        
                var TerminateAttendedTransferBtn = $("#line-"+ lineNum +"-btn-terminate-attended-transfer");
                TerminateAttendedTransferBtn.off('click');
                TerminateAttendedTransferBtn.on('click', function(){
                    newSession.bye().catch(function(error){
                        console.warn("Failed to BYE", error);
                    });
                    newCallStatus.html(lang.call_ended);
                    console.log("New call session end");
        
                    session.data.transfer[transferId].accept.complete = false;
                    session.data.transfer[transferId].accept.disposition = "bye";
                    session.data.transfer[transferId].accept.eventTime = utcDateNow();
        
                    $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
                    $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
                    $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();

                    $("#line-" + lineNum + "-msg").html(lang.attended_transfer_call_ended);

                    updateLineScroll(lineNum);

                    window.setTimeout(function(){
                        newCallStatus.hide();
                        CancelTransferSession(lineNum);
                        updateLineScroll(lineNum);
                    }, 1000);
                });
                TerminateAttendedTransferBtn.show();

                updateLineScroll(lineNum);
            },
            onReject:function(sip){
                console.log("New call session rejected: ", sip.message.reasonPhrase);
                newCallStatus.html(lang.call_rejected);
                session.data.transfer[transferId].disposition = sip.message.reasonPhrase;
                session.data.transfer[transferId].dispositionTime = utcDateNow();
        
                $("#line-"+ lineNum +"-txt-FindTransferBuddy").parent().show();
                $("#line-"+ lineNum +"-btn-blind-transfer").show();
                $("#line-"+ lineNum +"-btn-attended-transfer").show();
        
                $("#line-"+ lineNum +"-btn-complete-attended-transfer").hide();
                $("#line-"+ lineNum +"-btn-cancel-attended-transfer").hide();
                $("#line-"+ lineNum +"-btn-terminate-attended-transfer").hide();
        
                $("#line-"+ lineNum +"-msg").html(lang.attended_transfer_call_rejected);
        
                updateLineScroll(lineNum);
        
                window.setTimeout(function(){
                    newCallStatus.hide();
                    updateLineScroll(lineNum);
                }, 1000);
            }
        }
    }
    newSession.invite(inviterOptions).catch(function(e){
        console.warn("Failed to send INVITE:", e);
    });
}

// Conference Calls
// ================
function StartConferenceCall(lineNum){
    if($("#line-"+ lineNum +"-btn-CancelTransfer").is(":visible")){
        CancelTransferSession(lineNum);
        return;
    }

    $("#line-"+ lineNum +"-btn-Conference").hide();
    $("#line-"+ lineNum +"-btn-CancelConference").show();

    holdSession(lineNum);
    $("#line-"+ lineNum +"-txt-FindConferenceBuddy").val("");
    $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();

    $("#line-"+ lineNum +"-session-avatar").css("width", "50px");
    $("#line-"+ lineNum +"-session-avatar").css("height", "50px");
    RestoreCallControls(lineNum)

    $("#line-"+ lineNum +"-btn-conference-dial").show();
    $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
    $("#line-"+ lineNum +"-btn-join-conference-call").hide();
    $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();

    $("#line-"+ lineNum +"-conference-status").hide();

    $("#line-"+ lineNum +"-Conference").show();

    updateLineScroll(lineNum);
}
function CancelConference(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Null line or session");
        return;
    }
    var session = lineObj.SipSession;
    if(session.data.childsession){
        console.log("Child Conference call detected:", session.data.childsession.state);
        session.data.childsession.dispose().then(function(){
            session.data.childsession = null;
        }).catch(function(error){
            session.data.childsession = null;
            // Suppress message
        });
    }

    $("#line-"+ lineNum +"-session-avatar").css("width", "");
    $("#line-"+ lineNum +"-session-avatar").css("height", "");

    $("#line-"+ lineNum +"-btn-Conference").show();
    $("#line-"+ lineNum +"-btn-CancelConference").hide();

    unholdSession(lineNum);
    $("#line-"+ lineNum +"-Conference").hide();

    updateLineScroll(lineNum);
}
function conferenceOnkeydown(event, obj, lineNum) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13'){
        event.preventDefault();

        ConferenceDial(lineNum);
        return false;
    }
}
function ConferenceDial(lineNum){
    var dstNo = $("#line-"+ lineNum +"-txt-FindConferenceBuddy").val();
    if(EnableAlphanumericDial){
        dstNo = dstNo.replace(telAlphanumericRegEx, "").substring(0,MaxDidLength);
    }
    else {
        dstNo = dstNo.replace(telNumericRegEx, "").substring(0,MaxDidLength);
    }
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
    var confCallId = session.data.confcalls.length-1;

    updateLineScroll(lineNum);

    // SDP options
    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var spdOptions = {
        sessionDescriptionHandlerOptions: {
            earlyMedia: true,
            constraints: {
                audio: { deviceId : "default" },
                video: false
            }
        }
    }
    if(session.data.AudioSourceDevice != "default"){
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.deviceId = { exact: session.data.AudioSourceDevice }
    }
    // Add additional Constraints
    if(supportedConstraints.autoGainControl) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.autoGainControl = AutoGainControl;
    }
    if(supportedConstraints.echoCancellation) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.echoCancellation = EchoCancellation;
    }
    if(supportedConstraints.noiseSuppression) {
        spdOptions.sessionDescriptionHandlerOptions.constraints.audio.noiseSuppression = NoiseSuppression;
    }

    // Unlikely this will work
    if(session.data.withvideo){
        spdOptions.sessionDescriptionHandlerOptions.constraints.video = true;
        if(session.data.VideoSourceDevice != "default"){
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.deviceId = { exact: session.data.VideoSourceDevice }
        }
        // Add additional Constraints
        if(supportedConstraints.frameRate && maxFrameRate != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.frameRate = maxFrameRate;
        }
        if(supportedConstraints.height && videoHeight != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.height = videoHeight;
        }
        if(supportedConstraints.aspectRatio && videoAspectRatio != "") {
            spdOptions.sessionDescriptionHandlerOptions.constraints.video.aspectRatio = videoAspectRatio;
        }
    }

    // Create new call session
    console.log("CONFERENCE INVITE: ", "sip:" + dstNo + "@" + SipDomain);

    var targetURI = SIP.UserAgent.makeURI("sip:"+ dstNo.replace(/#/g, "%23") + "@" + SipDomain);
    var newSession = new SIP.Inviter(userAgent, targetURI, spdOptions);
    newSession.data = {}
    newSession.delegate = {
        onBye: function(sip){
            console.log("New call session ended with BYE");
            newCallStatus.html(lang.call_ended);
            session.data.confcalls[confCallId].disposition = "bye";
            session.data.confcalls[confCallId].dispositionTime = utcDateNow();
    
            $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();
            $("#line-"+ lineNum +"-btn-conference-dial").show();
    
            $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
            $("#line-"+ lineNum +"-btn-join-conference-call").hide();
            $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();
    
            $("#line-"+ lineNum +"-msg").html(lang.conference_call_terminated);
    
            updateLineScroll(lineNum);
    
            window.setTimeout(function(){
                newCallStatus.hide();
                updateLineScroll(lineNum);
            }, 1000);
        },
        onSessionDescriptionHandler: function(sdh, provisional){
            if (sdh) {
                if(sdh.peerConnection){
                    sdh.peerConnection.ontrack = function(event){
                        var pc = sdh.peerConnection;

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
                    }
                }
                else{
                    console.warn("onSessionDescriptionHandler fired without a peerConnection");
                }
            }
            else{
                console.warn("onSessionDescriptionHandler fired without a sessionDescriptionHandler");
            }
        }
    }
    // Make sure we always restore audio paths
    newSession.stateChange.addListener(function(newState){
        if (newState == SIP.SessionState.Terminated) {
            // Ends the mixed audio, and releases the mic
            if(session.data.childsession.data.AudioSourceTrack && session.data.childsession.data.AudioSourceTrack.kind == "audio"){
                session.data.childsession.data.AudioSourceTrack.stop();
            }
            // Restore Audio Stream as it was changed
            if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                var pc = session.sessionDescriptionHandler.peerConnection;
                pc.getSenders().forEach(function (RTCRtpSender) {
                    if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                        RTCRtpSender.replaceTrack(session.data.AudioSourceTrack).then(function(){
                            if(session.data.ismute){
                                RTCRtpSender.track.enabled = false;
                            }
                            else {
                                RTCRtpSender.track.enabled = true;
                            }
                        }).catch(function(){
                            console.error(e);
                        });
                        session.data.AudioSourceTrack = null;
                    }
                });
            }
        }
    });
    session.data.childsession = newSession;
    var inviterOptions = {
        requestDelegate: {
            onTrying: function(sip){
                newCallStatus.html(lang.ringing);
                session.data.confcalls[confCallId].disposition = "trying";
                session.data.confcalls[confCallId].dispositionTime = utcDateNow();

                $("#line-" + lineNum + "-msg").html(lang.conference_call_started);
            },
            onProgress:function(sip){
                newCallStatus.html(lang.ringing);
                session.data.confcalls[confCallId].disposition = "progress";
                session.data.confcalls[confCallId].dispositionTime = utcDateNow();
        
                $("#line-" + lineNum + "-msg").html(lang.conference_call_started);

                var CancelConferenceDialBtn = $("#line-"+ lineNum +"-btn-cancel-conference-dial");
                CancelConferenceDialBtn.off('click');
                CancelConferenceDialBtn.on('click', function(){
                    newSession.cancel().catch(function(error){
                        console.warn("Failed to CANCEL", error);
                    });
                    newCallStatus.html(lang.call_cancelled);
                    console.log("New call session canceled");
        
                    session.data.confcalls[confCallId].accept.complete = false;
                    session.data.confcalls[confCallId].accept.disposition = "cancel";
                    session.data.confcalls[confCallId].accept.eventTime = utcDateNow();
        
                    $("#line-" + lineNum + "-msg").html(lang.conference_call_cancelled);
        
                    updateLineScroll(lineNum);
                });
                CancelConferenceDialBtn.show();

                updateLineScroll(lineNum);
            },
            onRedirect:function(sip){
                console.log("Redirect received:", sip);
            },
            onAccept:function(sip){
                newCallStatus.html(lang.call_in_progress);
                $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
                session.data.confcalls[confCallId].complete = true;
                session.data.confcalls[confCallId].disposition = "accepted";
                session.data.confcalls[confCallId].dispositionTime = utcDateNow();

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
        
                    session.data.confcalls[confCallId].accept.complete = true;
                    session.data.confcalls[confCallId].accept.disposition = "join";
                    session.data.confcalls[confCallId].accept.eventTime = utcDateNow();
        
                    $("#line-"+ lineNum +"-btn-terminate-conference-call").show();
        
                    $("#line-" + lineNum + "-msg").html(lang.conference_call_in_progress);
        
                    JoinCallBtn.hide();
                    updateLineScroll(lineNum);

                    // Take the parent call off hold after a second
                    window.setTimeout(function(){
                        unholdSession(lineNum);
                        updateLineScroll(lineNum);
                    }, 1000);
                });
                JoinCallBtn.show();

                updateLineScroll(lineNum);

                // End Call
                var TerminateConfCallBtn = $("#line-"+ lineNum +"-btn-terminate-conference-call");
                TerminateConfCallBtn.off('click');
                TerminateConfCallBtn.on('click', function(){
                    newSession.bye().catch(function(e){
                        console.warn("Failed to BYE", e);
                    });
                    newCallStatus.html(lang.call_ended);
                    console.log("New call session end");

                    // session.data.confcalls[confCallId].accept.complete = false;
                    session.data.confcalls[confCallId].accept.disposition = "bye";
                    session.data.confcalls[confCallId].accept.eventTime = utcDateNow();

                    $("#line-" + lineNum + "-msg").html(lang.conference_call_ended);

                    updateLineScroll(lineNum);

                    window.setTimeout(function(){
                        newCallStatus.hide();
                        CancelConference(lineNum);
                        updateLineScroll(lineNum);
                    }, 1000);
                });
                TerminateConfCallBtn.show();
        
                updateLineScroll(lineNum);
            },
            onReject:function(sip){
                console.log("New call session rejected: ", sip.message.reasonPhrase);
                newCallStatus.html(lang.call_rejected);
                session.data.confcalls[confCallId].disposition = sip.message.reasonPhrase;
                session.data.confcalls[confCallId].dispositionTime = utcDateNow();
        
                $("#line-"+ lineNum +"-txt-FindConferenceBuddy").parent().show();
                $("#line-"+ lineNum +"-btn-conference-dial").show();
        
                $("#line-"+ lineNum +"-btn-cancel-conference-dial").hide();
                $("#line-"+ lineNum +"-btn-join-conference-call").hide();
                $("#line-"+ lineNum +"-btn-terminate-conference-call").hide();
        
                $("#line-"+ lineNum +"-msg").html(lang.conference_call_rejected);
        
                updateLineScroll(lineNum);
        
                window.setTimeout(function(){
                    newCallStatus.hide();
                    updateLineScroll(lineNum);
                }, 1000);
            }
        }
    }
    newSession.invite(inviterOptions).catch(function(e){
        console.warn("Failed to send INVITE:", e);
    });
}

// In-Session Call Functionality
// =============================

function cancelSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    lineObj.SipSession.data.terminateby = "us";
    lineObj.SipSession.data.reasonCode = 0;
    lineObj.SipSession.data.reasonText = "Call Cancelled";

    console.log("Cancelling session : "+ lineNum);
    if(lineObj.SipSession.state == SIP.SessionState.Initial || lineObj.SipSession.state == SIP.SessionState.Establishing){
        lineObj.SipSession.cancel();
    }
    else {
        console.warn("Session not in correct state for cancel.", lineObj.SipSession.state);
        console.log("Attempting teardown : "+ lineNum);
        teardownSession(lineObj);
    }

    $("#line-" + lineNum + "-msg").html(lang.call_cancelled);
}
function holdSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;
    var session = lineObj.SipSession;
    if(session.isOnHold == true) {
        console.log("Call is is already on hold:", lineNum);
        return;
    }
    console.log("Putting Call on hold:", lineNum);
    session.isOnHold = true;

    var sessionDescriptionHandlerOptions = session.sessionDescriptionHandlerOptionsReInvite;
    sessionDescriptionHandlerOptions.hold = true;
    session.sessionDescriptionHandlerOptionsReInvite = sessionDescriptionHandlerOptions;

    var options = {
        requestDelegate: {
            onAccept: function(){
                if(session && session.sessionDescriptionHandler && session.sessionDescriptionHandler.peerConnection){
                    var pc = session.sessionDescriptionHandler.peerConnection;
                    // Stop all the inbound streams
                    pc.getReceivers().forEach(function(RTCRtpReceiver){
                        if (RTCRtpReceiver.track) RTCRtpReceiver.track.enabled = false;
                    });
                    // Stop all the outbound streams (especially useful for Conference Calls!!)
                    pc.getSenders().forEach(function(RTCRtpSender){
                        // Mute Audio
                        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                            if(RTCRtpSender.track.IsMixedTrack == true){
                                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                                    console.log("Muting Mixed Audio Track : "+ session.data.AudioSourceTrack.label);
                                    session.data.AudioSourceTrack.enabled = false;
                                }
                            }
                            console.log("Muting Audio Track : "+ RTCRtpSender.track.label);
                            RTCRtpSender.track.enabled = false;
                        }
                        // Stop Video
                        else if(RTCRtpSender.track && RTCRtpSender.track.kind == "video"){
                            RTCRtpSender.track.enabled = false;
                        }
                    });
                }
                session.isOnHold = true;
                console.log("Call is is on hold:", lineNum);

                $("#line-" + lineNum + "-btn-Hold").hide();
                $("#line-" + lineNum + "-btn-Unhold").show();
                $("#line-" + lineNum + "-msg").html(lang.call_on_hold);

                // Log Hold
                if(!session.data.hold) session.data.hold = [];
                session.data.hold.push({ event: "hold", eventTime: utcDateNow() });

                updateLineScroll(lineNum);

                // Custom Web hook
                if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("hold", session);
            },
            onReject: function(){
                session.isOnHold = false;
                console.warn("Failed to put the call on hold:", lineNum);
            }
        }
    };
    session.invite(options).catch(function(error){
        session.isOnHold = false;
        console.warn("Error attempting to put the call on hold:", error);
    });
}
function unholdSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;
    var session = lineObj.SipSession;
    if(session.isOnHold == false) {
        console.log("Call is already off hold:", lineNum);
        return;
    }
    console.log("Taking call off hold:", lineNum);
    session.isOnHold = false;

    var sessionDescriptionHandlerOptions = session.sessionDescriptionHandlerOptionsReInvite;
    sessionDescriptionHandlerOptions.hold = false;
    session.sessionDescriptionHandlerOptionsReInvite = sessionDescriptionHandlerOptions;

    var options = {
        requestDelegate: {
            onAccept: function(){
                if(session && session.sessionDescriptionHandler && session.sessionDescriptionHandler.peerConnection){
                    var pc = session.sessionDescriptionHandler.peerConnection;
                    // Restore all the inbound streams
                    pc.getReceivers().forEach(function(RTCRtpReceiver){
                        if (RTCRtpReceiver.track) RTCRtpReceiver.track.enabled = true;
                    });
                    // Restore all the outbound streams
                    pc.getSenders().forEach(function(RTCRtpSender){
                        // Unmute Audio
                        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
                            if(RTCRtpSender.track.IsMixedTrack == true){
                                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                                    console.log("Unmuting Mixed Audio Track : "+ session.data.AudioSourceTrack.label);
                                    session.data.AudioSourceTrack.enabled = true;
                                }
                            }
                            console.log("Unmuting Audio Track : "+ RTCRtpSender.track.label);
                            RTCRtpSender.track.enabled = true;
                        }
                        else if(RTCRtpSender.track && RTCRtpSender.track.kind == "video") {
                            RTCRtpSender.track.enabled = true;
                        }
                    });
                }
                session.isOnHold = false;
                console.log("Call is off hold:", lineNum);

                $("#line-" + lineNum + "-btn-Hold").show();
                $("#line-" + lineNum + "-btn-Unhold").hide();
                $("#line-" + lineNum + "-msg").html(lang.call_in_progress);

                // Log Hold
                if(!session.data.hold) session.data.hold = [];
                session.data.hold.push({ event: "unhold", eventTime: utcDateNow() });

                updateLineScroll(lineNum);

                // Custom Web hook
                if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("unhold", session);
            },
            onReject: function(){
                session.isOnHold = true;
                console.warn("Failed to put the call on hold", lineNum);
            }
        }
    };
    session.invite(options).catch(function(error){
        session.isOnHold = true;
        console.warn("Error attempting to take to call off hold", error);
    });
}
function MuteSession(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    $("#line-"+ lineNum +"-btn-Unmute").show();
    $("#line-"+ lineNum +"-btn-Mute").hide();

    var session = lineObj.SipSession;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
            if(RTCRtpSender.track.IsMixedTrack == true){
                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                    console.log("Muting Mixed Audio Track : "+ session.data.AudioSourceTrack.label);
                    session.data.AudioSourceTrack.enabled = false;
                }
            }
            console.log("Muting Audio Track : "+ RTCRtpSender.track.label);
            RTCRtpSender.track.enabled = false;
        }
    });

    if(!session.data.mute) session.data.mute = [];
    session.data.mute.push({ event: "mute", eventTime: utcDateNow() });
    session.data.ismute = true;

    $("#line-" + lineNum + "-msg").html(lang.call_on_mute);

    updateLineScroll(lineNum);

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("mute", session);
}
function UnmuteSession(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    $("#line-"+ lineNum +"-btn-Unmute").hide();
    $("#line-"+ lineNum +"-btn-Mute").show();

    var session = lineObj.SipSession;
    var pc = session.sessionDescriptionHandler.peerConnection;
    pc.getSenders().forEach(function (RTCRtpSender) {
        if(RTCRtpSender.track && RTCRtpSender.track.kind == "audio") {
            if(RTCRtpSender.track.IsMixedTrack == true){
                if(session.data.AudioSourceTrack && session.data.AudioSourceTrack.kind == "audio"){
                    console.log("Unmuting Mixed Audio Track : "+ session.data.AudioSourceTrack.label);
                    session.data.AudioSourceTrack.enabled = true;
                }
            }
            console.log("Unmuting Audio Track : "+ RTCRtpSender.track.label);
            RTCRtpSender.track.enabled = true;
        }
    });

    if(!session.data.mute) session.data.mute = [];
    session.data.mute.push({ event: "unmute", eventTime: utcDateNow() });
    session.data.ismute = false;

    $("#line-" + lineNum + "-msg").html(lang.call_off_mute);

    updateLineScroll(lineNum);

    // Custom Web hook
    if(typeof web_hook_on_modify !== 'undefined') web_hook_on_modify("unmute", session);
}
function endSession(lineNum) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    console.log("Ending call with: "+ lineNum);
    lineObj.SipSession.data.terminateby = "us";
    lineObj.SipSession.data.reasonCode = 16;
    lineObj.SipSession.data.reasonText = "Normal Call clearing";

    lineObj.SipSession.bye().catch(function(e){
        console.warn("Failed to bye the session!", e);
    });

    $("#line-" + lineNum + "-msg").html(lang.call_ended);
    $("#line-" + lineNum + "-ActiveCall").hide();

    teardownSession(lineObj);

    updateLineScroll(lineNum);
}
function sendDTMF(lineNum, itemStr) {
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) return;

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCDTMFSender/insertDTMF
    var options = {
        duration: 100,
        interToneGap: 70
    }
    
    if(lineObj.SipSession.isOnHold == true){
        if(lineObj.SipSession.data.childsession){
            if(lineObj.SipSession.data.childsession.state == SIP.SessionState.Established){
                console.log("Sending DTMF ("+ itemStr +"): "+ lineObj.LineNumber + " child session");

                var result = lineObj.SipSession.data.childsession.sessionDescriptionHandler.sendDtmf(itemStr, options);
                if(result){
                    console.log("Sent DTMF ("+ itemStr +") child session");
                }
                else{
                    console.log("Failed to send DTMF ("+ itemStr +") child session");
                }
            }
            else {
                console.warn("Cannot Send DTMF ("+ itemStr +"): "+ lineObj.LineNumber + " is on hold, and the child session is not established");
            }
        } 
        else {
            console.warn("Cannot Send DTMF ("+ itemStr +"): "+ lineObj.LineNumber + " is on hold, and there is no child session");
        }
    } 
    else {
        if(lineObj.SipSession.state == SIP.SessionState.Established || lineObj.SipSession.state == SIP.SessionState.Establishing){
            console.log("Sending DTMF ("+ itemStr +"): "+ lineObj.LineNumber);

            var result = lineObj.SipSession.sessionDescriptionHandler.sendDtmf(itemStr, options);
            if(result){
                console.log("Sent DTMF ("+ itemStr +")");
            }
            else{
                console.log("Failed to send DTMF ("+ itemStr +")");
            }
        
            $("#line-" + lineNum + "-msg").html(lang.send_dtmf + ": "+ itemStr);
        
            updateLineScroll(lineNum);
    
            // Custom Web hook
            if(typeof web_hook_on_dtmf !== 'undefined') web_hook_on_dtmf(itemStr, lineObj.SipSession);
        } 
        else {
            console.warn("Cannot Send DTMF ("+ itemStr +"): "+ lineObj.LineNumber + " session is not establishing or established");
        }
    }
}
function switchVideoSource(lineNum, srcId){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null){
        console.warn("Line or Session is Null");
        return;
    }
    var session = lineObj.SipSession;

    $("#line-" + lineNum + "-msg").html(lang.switching_video_source);

    var supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    var constraints = { 
        audio: false, 
        video: { deviceId: "default" }
    }
    if(srcId != "default"){
        constraints.video.deviceId = { exact: srcId }
    }

    // Add additional Constraints
    if(supportedConstraints.frameRate && maxFrameRate != "") {
        constraints.video.frameRate = maxFrameRate;
    }
    if(supportedConstraints.height && videoHeight != "") {
        constraints.video.height = videoHeight;
    }
    if(supportedConstraints.aspectRatio && videoAspectRatio != "") {
        constraints.video.aspectRatio = videoAspectRatio;
    }

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
                    else {
                        RTCRtpSender.track.enabled = true;
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

    // TODO: This needs work!
    var newCanvas = $('<canvas/>');
    newCanvas.prop("id", "line-" + lineNum + "-scratchpad");
    $("#line-" + lineNum + "-scratchpad-container").append(newCanvas);
    $("#line-" + lineNum + "-scratchpad").css("display", "inline-block");
    $("#line-" + lineNum + "-scratchpad").css("width", "100%"); // SD
    $("#line-" + lineNum + "-scratchpad").css("height", "100%"); // SD
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
                    else {
                        RTCRtpSender.track.enabled = true;
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
    $("#line-"+ lineNum +"-remote-videos").hide();
    // $("#line-"+ lineNum +"-remoteVideo").appendTo("#line-" + lineNum + "-preview-container");

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
            // Portrait... (phone turned on its side)
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
            // This doesn't really work?
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

    $("#line-" + lineNum + "-msg").html(lang.switching_to_shared_screen);

    var localStream = new MediaStream();
    var pc = session.sessionDescriptionHandler.peerConnection;

    // TODO: Remove legacy ones
    if (navigator.getDisplayMedia) {
        // EDGE, legacy support
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
                    else {
                        RTCRtpSender.track.enabled = true;
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
                    else {
                        RTCRtpSender.track.enabled = true;
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
function ShowDtmfMenu(lineNum){
    console.log("Show DTMF");
    HidePopup();

    RestoreCallControls(lineNum)

    // DTMF
    var html = ""
    html += "<div>";
    html += "<table cellspacing=10 cellpadding=0 style=\"margin-left:auto; margin-right: auto\">";
    html += "<tr><td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '1')\"><div>1</div><span>&nbsp;</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '2')\"><div>2</div><span>ABC</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '3')\"><div>3</div><span>DEF</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '4')\"><div>4</div><span>GHI</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '5')\"><div>5</div><span>JKL</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '6')\"><div>6</div><span>MNO</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '7')\"><div>7</div><span>PQRS</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '8')\"><div>8</div><span>TUV</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '9')\"><div>9</div><span>WXYZ</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '*')\">*</button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '0')\">0</button></td>"
    html += "<td><button class=dialButtons onclick=\"sendDTMF('"+ lineNum +"', '#')\">#</button></td></tr>";
    html += "</table>";
    html += "</div>";

    var h = 400;
    var w = 240
    OpenWindow(html, lang.send_dtmf, h, w, false, false, lang.cancel, function(){
        CloseWindow()
    });
}
function ShowPresentMenu(obj, lineNum){
    var items = [];
    items.push({value: "src-camera", icon : "fa fa-video-camera", text: lang.camera, isHeader: false }); // Camera
    items.push({value: "src-canvas", icon : "fa fa-pencil-square", text: lang.scratchpad, isHeader: false }); // Canvas
    items.push({value: "src-desktop", icon : "fa fa-desktop", text: lang.screen, isHeader: false }); // Screens
    items.push({value: "src-video", icon : "fa fa-file-video-o", text: lang.video, isHeader: false }); // Video
    items.push({value: "src-blank", icon : "fa fa-ban", text: lang.blank, isHeader: false }); // None

    var menu = {
        selectEvent : function( event, ui ) {
            var id = ui.item.attr("value");
            if(id != null) {
                if(id == "src-camera") PresentCamera(lineNum);
                if(id == "src-canvas") PresentScratchpad(lineNum);
                if(id == "src-desktop") PresentScreen(lineNum);
                if(id == "src-video") PresentVideo(lineNum);
                if(id == "src-blank") PresentBlank(lineNum);
                HidePopup();
            }
            else {
                HidePopup();
            }
        },
        createEvent : null,
        autoFocus : true,
        items : items
    }
    PopupMenu(obj, menu);
}

function ShowCallTimeline(lineNum){
    console.log("Show Timeline");
    HidePopup();
    RestoreCallControls(lineNum)

    if($("#line-"+ lineNum +"-AudioStats").is(":visible")){
        // The AudioStats is open, they can't take the same space
        HideCallStats(lineNum)
    }

    $("#line-"+ lineNum +"-AudioOrVideoCall").hide();
    $("#line-"+ lineNum +"-CallDetails").show();
    
    $("#line-"+ lineNum +"-btn-ShowTimeline").hide();
    $("#line-"+ lineNum +"-btn-HideTimeline").show();
}
function HideCallTimeline(lineNum){
    console.log("Hide Timeline");
    HidePopup();

    $("#line-"+ lineNum +"-CallDetails").hide();
    $("#line-"+ lineNum +"-AudioOrVideoCall").show();

    $("#line-"+ lineNum +"-btn-ShowTimeline").show();
    $("#line-"+ lineNum +"-btn-HideTimeline").hide();
}
function ShowCallStats(lineNum){
    console.log("Show Call Stats");
    HidePopup();
    RestoreCallControls(lineNum)

    if($("#line-"+ lineNum +"-CallDetails").is(":visible")){
        // The Timeline is open, they can't take the same space
        HideCallTimeline(lineNum)
    }

    $("#line-"+ lineNum +"-AudioOrVideoCall").hide();
    $("#line-"+ lineNum +"-AudioStats").show();

    $("#line-"+ lineNum +"-btn-ShowCallStats").hide();
    $("#line-"+ lineNum +"-btn-HideCallStats").show();
}
function HideCallStats(lineNum){
    console.log("Hide Call Stats");

    HidePopup();
    $("#line-"+ lineNum +"-AudioOrVideoCall").show();
    $("#line-"+ lineNum +"-AudioStats").hide();

    $("#line-"+ lineNum +"-btn-ShowCallStats").show();
    $("#line-"+ lineNum +"-btn-HideCallStats").hide();
}
function ToggleMoreButtons(lineNum){
    if($("#line-"+ lineNum +"-btn-more").is(":visible")){
        // The more buttons are showing, drop them down
        RestoreCallControls(lineNum);
    } else {
        ExpandCallControls(lineNum);
    }
}
function ExpandCallControls(lineNum){
    $("#line-"+ lineNum +"-btn-more").show(200);
    $("#line-"+ lineNum +"-btn-ControlToggle").html('<i class=\"fa fa-chevron-down\"></i>');
}
function RestoreCallControls(lineNum){
    $("#line-"+ lineNum +"-btn-more").hide(200);
    $("#line-"+ lineNum +"-btn-ControlToggle").html('<i class=\"fa fa-chevron-up\"></i>');
}
function ExpandVideoArea(lineNum){
    $("#line-" + lineNum + "-call-fullscreen").prop("class","streamSection highlightSection FullScreenVideo");

    $("#line-" + lineNum + "-btn-restore").show();
    $("#line-" + lineNum + "-btn-expand").hide();

    $("#line-" + lineNum + "-VideoCall").css("background-color", "#000000");

    RedrawStage(lineNum, false);
    if(typeof web_hook_on_expand_video_area !== 'undefined') {
        web_hook_on_expand_video_area(lineNum);
    }
}
function RestoreVideoArea(lineNum){
    $("#line-" + lineNum + "-call-fullscreen").prop("class","streamSection highlightSection");

    $("#line-" + lineNum + "-btn-restore").hide();
    $("#line-" + lineNum + "-btn-expand").show();

    $("#line-" + lineNum + "-VideoCall").css("background-color", "");

    RedrawStage(lineNum, false);
    if(typeof web_hook_on_restore_video_area !== 'undefined') {
        web_hook_on_restore_video_area(lineNum);
    }
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
function ShowDial(){
    CloseUpSettings();

    $("#myContacts").hide();
    $("#searchArea").hide();
    $("#actionArea").empty();

    var html = "<div style=\"text-align:right\"><button class=roundButtons onclick=\"ShowContacts()\"><i class=\"fa fa-close\"></i></button></div>"
    html += "<div style=\"text-align:center; margin-top:15px\"><input id=dialText class=dialTextInput oninput=\"handleDialInput(this, event)\" onkeydown=\"dialOnkeydown(event, this)\" style=\"width:170px; height:32px\"><button id=dialDeleteKey class=roundButtons onclick=\"KeyPress('del')\">⌫</button></div>";
    html += "<table cellspacing=10 cellpadding=0 style=\"margin-left:auto; margin-right: auto\">";
    html += "<tr><td><button class=dialButtons onclick=\"KeyPress('1')\"><div>1</div><span>&nbsp;</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('2')\"><div>2</div><span>ABC</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('3')\"><div>3</div><span>DEF</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"KeyPress('4')\"><div>4</div><span>GHI</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('5')\"><div>5</div><span>JKL</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('6')\"><div>6</div><span>MNO</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"KeyPress('7')\"><div>7</div><span>PQRS</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('8')\"><div>8</div><span>TUV</span></button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('9')\"><div>9</div><span>WXYZ</span></button></td></tr>";
    html += "<tr><td><button class=dialButtons onclick=\"KeyPress('*')\">*</button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('0')\">0</button></td>"
    html += "<td><button class=dialButtons onclick=\"KeyPress('#')\">#</button></td></tr>";
    html += "</table>";
    html += "<div style=\"text-align: center; margin-bottom:15px\">";
    html += "<button class=\"dialButtons dialButtonsDial\" id=dialAudio title=\""+ lang.audio_call  +"\" onclick=\"DialByLine('audio')\"><i class=\"fa fa-phone\"></i></button>";
    if(EnableVideoCalling == true){
        html += "<button class=\"dialButtons dialButtonsDial\" id=dialVideo style=\"margin-left:20px\" title=\""+ lang.video_call +"\" onclick=\"DialByLine('video')\"><i class=\"fa fa-video-camera\"></i></button>";
    }
    html += "</div>";
    $("#actionArea").html(html);
    $("#dialDeleteKey").hide();
    $("#actionArea").show();
    $("#dialText").focus();
}
function handleDialInput(obj, event){
    if(EnableAlphanumericDial){
        $("#dialText").val($("#dialText").val().replace(/[^\da-zA-Z\*\#\+]/g, "").substring(0,MaxDidLength));
    }
    else {
        $("#dialText").val($("#dialText").val().replace(/[^\d\*\#\+]/g, "").substring(0,MaxDidLength));
    }
    $("#dialVideo").prop('disabled', ($("#dialText").val().length >= DidLength));
    if($("#dialText").val().length > 0){
        $("#dialText").css("width","138px");
        $("#dialDeleteKey").show();
    } else {
        $("#dialText").css("width","170px");
        $("#dialDeleteKey").hide();
    }
}
function dialOnkeydown(event, obj, buddy) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13'){
        event.preventDefault();

        if(event.ctrlKey && EnableVideoCalling == true){
            DialByLine('video');
        }
        else {
            // Defaults to audio dial
            DialByLine('audio');
        }

        return false;
    }
}
function KeyPress(num){
    var currVal = $("#dialText").val();
    var textElObj = $("#dialText").get(0);
    var ss = textElObj.selectionStart;
    var se = textElObj.selectionEnd;
    var ln = currVal.length;

    var newValue = "";
    if(ss == se){
        // Cursor is in a spot with no selection
        if(num == "del"){
            newValue = currVal.substring(0, ss-1) + currVal.substring(se, ln);
        } else {
            newValue = currVal.substring(0, ss) + num + currVal.substring(se, ln);
        }
        $("#dialText").val(newValue.substring(0,MaxDidLength));
        $("#dialText").focus();
        if(num == "del"){
            textElObj.setSelectionRange(ss-1, ss-1);
        }else {
            textElObj.setSelectionRange(ss+1, ss+1);
        }
    } else {
        if(num == "del"){
            newValue = currVal.substring(0, ss) + currVal.substring(se, ln);
        } else {
            newValue = currVal.substring(0, ss) + num + currVal.substring(se, ln);
        }
        $("#dialText").val(newValue.substring(0,MaxDidLength));
        $("#dialText").focus();
        if(num == "del"){
            textElObj.setSelectionRange(ss, ss);
        }else {
            textElObj.setSelectionRange(ss+1, ss+1);
        }
    }
    
    $("#dialVideo").prop('disabled', ($("#dialText").val().length >= DidLength));
    if($("#dialText").val().length > 0){
        $("#dialText").css("width","138px");
        $("#dialDeleteKey").show();
    } else {
        $("#dialText").css("width","170px");
        $("#dialDeleteKey").hide();
    }
}
function CloseUpSettings(){
    // Video Preview
    try{
        settingsVideoStreamTrack.stop();
        console.log("settingsVideoStreamTrack... stopped");
    }
    catch(e){}
    try{
        var localVideo = $("#local-video-preview").get(0);
        localVideo.srcObject = null;
    }
    catch{}
    settingsVideoStream = null;

    // Microphone Preview
    try{
        settingsMicrophoneStreamTrack.stop();
        console.log("settingsMicrophoneStreamTrack... stopped");
    }
    catch(e){}
    settingsMicrophoneStream = null;

    // Microphone Meter
    try{
        settingsMicrophoneSoundMeter.stop();
    }
    catch(e){}
    settingsMicrophoneSoundMeter = null;

    // Speaker Preview
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

    // Ringer Preview
    try{
        window.SettingsRingerAudio.pause();
    }
    catch(e){}
    window.SettingsRingerAudio = null;

    try{
        var tracks = window.SettingsRingerStream.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });
    }
    catch(e){}
    window.SettingsRingerStream = null;

    try{
        var soundMeter = window.SettingsRingerStreamMeter;
        soundMeter.stop();
    }
    catch(e){}
    window.SettingsRingerStreamMeter = null;
}
function ShowContacts(){

    CloseUpSettings()

    $("#actionArea").hide();
    $("#actionArea").empty();

    $("#myContacts").show();
    $("#searchArea").show();
}
function ShowSortAnfFilter(){
    ShowContacts();

    $("#myContacts").hide();
    $("#searchArea").hide();
    $("#actionArea").empty();

    var html = "<div style=\"text-align:right\"><button class=roundButtons onclick=\"ShowContacts()\"><i class=\"fa fa-close\"></i></button></div>"
    html += "<table cellspacing=10 cellpadding=0 style=\"margin-left:auto; margin-right: auto\">";
    // By Type (and what order)
    html += "<tr><td><div><input disabled type=radio name=sort_by id=sort_by_type><label for=sort_by_type>"+ lang.sort_type +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_cex><label for=sort_by_type_cex>"+ lang.sort_type_cex +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_cxe><label for=sort_by_type_cxe>"+ lang.sort_type_cxe +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_xec><label for=sort_by_type_xec>"+ lang.sort_type_xec +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_xce><label for=sort_by_type_xce>"+ lang.sort_type_xce +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_exc><label for=sort_by_type_exc>"+ lang.sort_type_exc +"</label></div>";
    html += "<div style=\"margin-left:20px\"><input type=radio name=sort_by_type id=sort_by_type_ecx><label for=sort_by_type_ecx>"+ lang.sort_type_ecx +"</label></div>";
    html += "</td></tr>";
    // By Extension
    html += "<tr><td><div><input type=radio name=sort_by id=sort_by_exten><label for=sort_by_exten>"+ lang.sort_exten +"</label></div></td></tr>";
    // By Alphabetical 
    html += "<tr><td><div><input type=radio name=sort_by id=sort_by_alpha><label for=sort_by_alpha>"+ lang.sort_alpha +"</label></div></td></tr>";
    // Only Last Activity
    html += "<tr><td><div><input type=radio name=sort_by id=sort_by_activity><label for=sort_by_activity>"+ lang.sort_activity +"</label></div></td></tr>";

    // Secondary Options
    html += "<tr><td><div><input type=checkbox id=sort_auto_delete_at_end><label for=sort_auto_delete_at_end>"+ lang.sort_auto_delete_at_end +"</label></div></td></tr>";
    html += "<tr><td><div><input type=checkbox id=sort_auto_delete_hide><label for=sort_auto_delete_hide>"+ lang.sort_auto_delete_hide +"</label></div></td></tr>";
    html += "<tr><td><div><input type=checkbox id=sort_show_exten_num><label for=sort_show_exten_num>"+ lang.sort_show_exten_num +"</label></div></td></tr>";

    html += "</table>";
    html += "</div>";
    $("#actionArea").html(html);

    $("#sort_by_type").prop("checked", BuddySortBy=="type");
    $("#sort_by_type_cex").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="c|e|x"));
    $("#sort_by_type_cxe").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="c|x|e"));
    $("#sort_by_type_xec").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="x|e|c"));
    $("#sort_by_type_xce").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="x|c|e"));
    $("#sort_by_type_exc").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="e|x|c"));
    $("#sort_by_type_ecx").prop("checked", (BuddySortBy=="type" && SortByTypeOrder=="e|c|x"));
    $("#sort_by_exten").prop("checked", BuddySortBy=="extension");
    $("#sort_by_alpha").prop("checked", BuddySortBy=="alphabetical");
    $("#sort_by_activity").prop("checked", BuddySortBy=="activity");

    $("#sort_auto_delete_at_end").prop("checked", BuddyAutoDeleteAtEnd==true);
    $("#sort_auto_delete_hide").prop("checked", HideAutoDeleteBuddies==true);
    $("#sort_show_exten_num").prop("checked", BuddyShowExtenNum==true);

    $("#sort_by_type_cex").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "c|e|x"
        localDB.setItem("SortByTypeOrder", "c|e|x"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });
    $("#sort_by_type_cxe").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "c|x|e"
        localDB.setItem("SortByTypeOrder", "c|x|e"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });
    $("#sort_by_type_xec").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "x|e|c"
        localDB.setItem("SortByTypeOrder", "x|e|c"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });
    $("#sort_by_type_xce").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "x|e|c"
        localDB.setItem("SortByTypeOrder", "x|c|e"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });
    $("#sort_by_type_exc").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "e|x|c"
        localDB.setItem("SortByTypeOrder", "e|x|c"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });
    $("#sort_by_type_ecx").change(function(){
        BuddySortBy = "type";
        localDB.setItem("BuddySortBy", "type"); 
        SortByTypeOrder = "e|c|x"
        localDB.setItem("SortByTypeOrder", "e|c|x"); 
        $("#sort_by_type").prop("checked", true);

        UpdateBuddyList();
    });


    $("#sort_by_exten").change(function(){
        BuddySortBy = "extension";
        localDB.setItem("BuddySortBy", "extension"); 
        $("#sort_by_type_cex").prop("checked", false);
        $("#sort_by_type_cxe").prop("checked", false);
        $("#sort_by_type_xec").prop("checked", false);
        $("#sort_by_type_xce").prop("checked", false);
        $("#sort_by_type_exc").prop("checked", false);
        $("#sort_by_type_ecx").prop("checked", false);

        UpdateBuddyList();
    });
    $("#sort_by_alpha").change(function(){
        BuddySortBy = "alphabetical";
        localDB.setItem("BuddySortBy", "alphabetical");
        $("#sort_by_type_cex").prop("checked", false);
        $("#sort_by_type_cxe").prop("checked", false);
        $("#sort_by_type_xec").prop("checked", false);
        $("#sort_by_type_xce").prop("checked", false);
        $("#sort_by_type_exc").prop("checked", false);
        $("#sort_by_type_ecx").prop("checked", false);
        UpdateBuddyList();
    });
    $("#sort_by_activity").change(function(){
        BuddySortBy = "activity";
        localDB.setItem("BuddySortBy", "activity");
        $("#sort_by_type_cex").prop("checked", false);
        $("#sort_by_type_cxe").prop("checked", false);
        $("#sort_by_type_xec").prop("checked", false);
        $("#sort_by_type_xce").prop("checked", false);
        $("#sort_by_type_exc").prop("checked", false);
        $("#sort_by_type_ecx").prop("checked", false);

        UpdateBuddyList();
    });

    $("#sort_auto_delete_at_end").change(function(){
        BuddyAutoDeleteAtEnd = this.checked;
        localDB.setItem("BuddyAutoDeleteAtEnd", (this.checked)? "1" : "0");
        
        if(this.checked){
            $("#sort_auto_delete_hide").prop("checked", false);
            HideAutoDeleteBuddies = false;
            localDB.setItem("HideAutoDeleteBuddies", "0");
        }

        UpdateBuddyList();
    });
    $("#sort_auto_delete_hide").change(function(){
        HideAutoDeleteBuddies = this.checked;
        localDB.setItem("HideAutoDeleteBuddies", (this.checked)? "1" : "0");

        if(this.checked){
            $("#sort_auto_delete_at_end").prop("checked", false);
            BuddyAutoDeleteAtEnd = false;
            localDB.setItem("BuddyAutoDeleteAtEnd", "0");    
        }

        UpdateBuddyList();
    });
    $("#sort_show_exten_num").change(function(){
        BuddyShowExtenNum = this.checked;
        localDB.setItem("BuddyShowExtenNum", (this.checked)? "1" : "0");

        UpdateBuddyList();
    });

    $("#actionArea").show();
}


/**
 * Primary method for making a call. 
 * @param {string} type (required) Either "audio" or "video". Will setup UI according to this type.
 * @param {Buddy} buddy (optional) The buddy to dial if provided.
 * @param {sting} numToDial (required) The number to dial.
 * @param {string} CallerID (optional) If no buddy provided, one is generated automatically using this callerID and the numToDial
 * @param {Array<string>} extraHeaders = (optional) Array of headers to include in the INVITE eg: ["foo: bar"] (Note the space after the :)
 */
function DialByLine(type, buddy, numToDial, CallerID, extraHeaders){
    if(userAgent == null || userAgent.isRegistered() == false){
        ShowMyProfile();
        return;
    }

    var numDial = (numToDial)? numToDial : $("#dialText").val();
    if(EnableAlphanumericDial){
        numDial = numDial.replace(telAlphanumericRegEx, "").substring(0,MaxDidLength);
    }
    else {
        numDial = numDial.replace(telNumericRegEx, "").substring(0,MaxDidLength);
    }
    if(numDial.length == 0) {
        console.warn("Enter number to dial");
        return;
    }

    ShowContacts();

    // Create a Buddy if one is not already existing
    var buddyObj = (buddy)? FindBuddyByIdentity(buddy) : FindBuddyByDid(numDial);
    if(buddyObj == null) {
        var buddyType = (numDial.length > DidLength)? "contact" : "extension";
        // Assumption but anyway: If the number starts with a * or # then its probably not a subscribable did,  
        // and is probably a feature code.
        if(numDial.substring(0,1) == "*" || numDial.substring(0,1) == "#") buddyType = "contact";
        buddyObj = MakeBuddy(buddyType, true, false, false, (CallerID)? CallerID : numDial, numDial, null, false, null, AutoDeleteDefault, false);
    }

    // Create a Line
    newLineNumber = newLineNumber + 1;
    var lineObj = new Line(newLineNumber, buddyObj.CallerIDName, numDial, buddyObj);
    Lines.push(lineObj);
    AddLineHtml(lineObj, "outbound");
    SelectLine(newLineNumber);
    UpdateBuddyList();

    // Start Call Invite
    if(type == "audio"){
        AudioCall(lineObj, numDial, extraHeaders);
    } 
    else {
        VideoCall(lineObj, numDial, extraHeaders);
    }

    try{
        $("#line-" + newLineNumber).get(0).scrollIntoViewIfNeeded();
    } catch(e){}
}
function SelectLine(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;
    
    var displayLineNumber = 0;
    for(var l = 0; l < Lines.length; l++) {
        if(Lines[l].LineNumber == lineObj.LineNumber) displayLineNumber = l+1;
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

    $("#line-ui-" + lineObj.LineNumber + "-DisplayLineNo").html("<i class=\"fa fa-phone\"></i> "+ lang.line +" "+ displayLineNumber);
    $("#line-ui-" + lineObj.LineNumber + "-LineIcon").html(displayLineNumber);

    // Switch the SIP Sessions
    SwitchLines(lineObj.LineNumber);

    // Update Lines List
    for(var l = 0; l < Lines.length; l++) {
        var classStr = (Lines[l].LineNumber == lineObj.LineNumber)? "buddySelected" : "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.isOnHold)? "buddyActiveCallHollding" : "buddyActiveCall";

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
function AddLineHtml(lineObj, direction){
    var avatar = getPicture(lineObj.BuddyObj.identity);

    var html = "<table id=\"line-ui-"+ lineObj.LineNumber +"\" class=stream cellspacing=0 cellpadding=0>";
    html += "<tr><td class=\"streamSection highlightSection\" style=\"height: 85px;\">";

    // Close|Return|Back Button
    html += "<div style=\"float:left; margin:0px; padding:5px; height:38px; line-height:38px\">"
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-back\" onclick=\"CloseLine('"+ lineObj.LineNumber +"')\" class=roundButtons title=\""+ lang.back +"\"><i class=\"fa fa-chevron-left\"></i></button> ";
    html += "</div>"

    // Profile UI
    html += "<div class=contact style=\"cursor: unset; float: left;\">";
    html += "<div id=\"line-ui-"+ lineObj.LineNumber +"-LineIcon\" class=lineIcon>"+ lineObj.LineNumber +"</div>";
    html += "<div id=\"line-ui-"+ lineObj.LineNumber +"-DisplayLineNo\" class=contactNameText><i class=\"fa fa-phone\"></i> "+ lang.line +" "+ lineObj.LineNumber +"</div>";
    html += "<div class=presenceText style=\"max-width:150px\">"+ lineObj.DisplayNumber +"</div>";
    html += "</div>";

    // Audio Activity
    html += "<div style=\"float:right; line-height: 46px;\">";
    html += "<div  id=\"line-"+ lineObj.LineNumber +"-monitoring\" style=\"margin-right:10px\">";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-microphone\"></i></span> ";
    html += "<span class=meterContainer title=\""+ lang.microphone_levels +"\">";
    html += "<span id=\"line-"+ lineObj.LineNumber +"-Mic\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "<span style=\"vertical-align: middle\"><i class=\"fa fa-volume-up\"></i></span> ";
    html += "<span class=meterContainer title=\""+ lang.speaker_levels +"\">";
    html += "<span id=\"line-"+ lineObj.LineNumber +"-Speaker\" class=meterLevel style=\"height:0%\"></span>";
    html += "</span> ";
    html += "</div>";
    
    html += "</div>";

    // Separator --------------------------------------------------------------------------
    html += "<div style=\"clear:both; height:0px\"></div>"

    // General Messages
    html += "<div id=\"line-"+ lineObj.LineNumber +"-timer\" class=CallTimer></div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-msg\" class=callStatus style=\"display:none\">...</div>";

    // Remote Audio Object
    html += "<div style=\"display:none;\">";
    html += "<audio id=\"line-"+ lineObj.LineNumber +"-remoteAudio\"></audio>";
    html += "</div>";

    html += "</td></tr>";

    // Next Has Dynamic Content
    html += "<tr><td id=\"line-"+ lineObj.LineNumber +"-call-fullscreen\" class=\"streamSection highlightSection\">"

    // Call Answer UI
    html += "<div id=\"line-"+ lineObj.LineNumber +"-AnswerCall\" style=\"display:none\">";
    html += "<div class=\"CallPictureUnderlay\" style=\"background-image: url('"+ avatar +"')\"></div>";
    html += "<div class=\"CallColorUnderlay\"></div>";
    html += "<div class=\"CallUi\">";
    html += "<div class=callingDisplayName>"+ lineObj.DisplayName +"</div>";
    html += "<div class=callingDisplayNumber>"+ lineObj.DisplayNumber +"</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-in-avatar\" class=\"inCallAvatar\" style=\"background-image: url('"+ avatar +"')\"></div>";
    html += "<div class=answerCall>";
    html += "<button onclick=\"AnswerAudioCall('"+ lineObj.LineNumber +"')\" class=answerButton><i class=\"fa fa-phone\"></i> "+ lang.answer_call +"</button> ";
    if(EnableVideoCalling == true) {
        html += " <button id=\"line-"+ lineObj.LineNumber +"-answer-video\" onclick=\"AnswerVideoCall('"+ lineObj.LineNumber +"')\" class=answerButton><i class=\"fa fa-video-camera\"></i> "+ lang.answer_call_with_video +"</button> ";
    }
    html += " <button onclick=\"RejectCall('"+ lineObj.LineNumber +"')\" class=rejectButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.reject_call +"</button> ";
    // CRM
    html += "<div id=\"line-"+ lineObj.LineNumber +"-answer-crm-space\">"
    // Use this DIV for anything really. Call your own CRM, and have the results display here
    html += "</div>"; // crm
    html += "</div>"; //.answerCall

    html += "</div>"; //.CallUi
    html += "</div>"; //-AnswerCall

    // Dialing Out Progress
    html += "<div id=\"line-"+ lineObj.LineNumber +"-progress\" style=\"display:none\">";
    html += "<div class=\"CallPictureUnderlay\" style=\"background-image: url('"+ avatar +"')\"></div>";
    html += "<div class=\"CallColorUnderlay\"></div>";
    html += "<div class=\"CallUi\">";
    html += "<div class=callingDisplayName>"+ lineObj.DisplayName +"</div>";
    html += "<div class=callingDisplayNumber>"+ lineObj.DisplayNumber +"</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-out-avatar\" class=\"inCallAvatar\" style=\"background-image: url('"+ avatar +"')\"></div>";
    html += "<div class=progressCall>"
    html += "<button onclick=\"cancelSession('"+ lineObj.LineNumber +"')\" class=rejectButton><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel +"</button>"
    html += " <button id=\"line-"+ lineObj.LineNumber +"-early-dtmf\" onclick=\"ShowDtmfMenu('"+ lineObj.LineNumber +"')\" style=\"display:none\"><i class=\"fa fa-keyboard-o\"></i> "+ lang.send_dtmf +"</button>"
    html += "</div>"; //.progressCall
    html += "</div>"; //.CallUi
    html += "</div>"; // -progress

    // Active Call UI
    html += "<div id=\"line-"+ lineObj.LineNumber +"-ActiveCall\" class=cleanScroller style=\"display:none; position: absolute; top: 0px; left: 0px; height: 100%; width: 100%;\">";

    // Audio or Video Call (gets changed with InCallControls)
    html += "<div id=\"line-"+ lineObj.LineNumber +"-AudioOrVideoCall\" style=\"height:100%\">";

    // Audio Call UI
    html += "<div id=\"line-"+ lineObj.LineNumber +"-AudioCall\" style=\"height:100%; display:none\">";
    html += "<div class=\"CallPictureUnderlay\" style=\"background-image: url('"+ avatar +"')\"></div>";
    html += "<div class=\"CallColorUnderlay\"></div>";
    html += "<div class=\"CallUi\">";
    html += "<div class=callingDisplayName>"+ lineObj.DisplayName +"</div>";
    html += "<div class=callingDisplayNumber>"+ lineObj.DisplayNumber +"</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-session-avatar\" class=\"inCallAvatar\" style=\"background-image: url('"+ avatar +"')\"></div>";

    // Call Transfer
    html += "<div id=\"line-"+ lineObj.LineNumber +"-Transfer\" style=\"text-align: center; line-height:40px; display:none\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<span class=searchClean><input id=\"line-"+ lineObj.LineNumber +"-txt-FindTransferBuddy\" oninput=\"QuickFindBuddy(this,'"+ lineObj.LineNumber +"')\" onkeydown=\"transferOnkeydown(event, this, '"+ lineObj.LineNumber +"')\" type=text autocomplete=none style=\"width:150px;\" autocomplete=none placeholder=\""+ lang.search_or_enter_number +"\"></span>";
    html += "<br>"
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-blind-transfer\" onclick=\"BlindTransfer('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i> "+ lang.blind_transfer +"</button>"
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-attended-transfer\" onclick=\"AttendedTransfer('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-reply-all\" style=\"transform: rotateY(180deg)\"></i> "+ lang.attended_transfer +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-complete-attended-transfer\" style=\"display:none\"><i class=\"fa fa-reply-all\" style=\"transform: rotateY(180deg)\"></i> "+ lang.complete_transfer +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-cancel-attended-transfer\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel_transfer +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-terminate-attended-transfer\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.end_transfer_call +"</button>";
    html += "</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-transfer-status\" class=callStatus style=\"margin-top:10px; display:none\">...</div>";
    html += "<audio id=\"line-"+ lineObj.LineNumber +"-transfer-remoteAudio\" style=\"display:none\"></audio>";
    html += "</div>"; //-Transfer

    // Call Conference
    html += "<div id=\"line-"+ lineObj.LineNumber +"-Conference\" style=\"text-align: center; line-height:40px; display:none\">";
    html += "<div style=\"margin-top:10px\">";
    html += "<span class=searchClean><input id=\"line-"+ lineObj.LineNumber +"-txt-FindConferenceBuddy\" oninput=\"QuickFindBuddy(this,'"+ lineObj.LineNumber +"')\" onkeydown=\"conferenceOnkeydown(event, this, '"+ lineObj.LineNumber +"')\" type=text autocomplete=none style=\"width:150px;\" autocomplete=none placeholder=\""+ lang.search_or_enter_number +"\"></span>";
    html += "<br>"
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-conference-dial\" onclick=\"ConferenceDial('"+ lineObj.LineNumber +"')\"><i class=\"fa fa-phone\"></i> "+ lang.call +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-cancel-conference-dial\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.cancel_call +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-join-conference-call\" style=\"display:none\"><i class=\"fa fa-users\"></i> "+ lang.join_conference_call +"</button>";
    html += " <button id=\"line-"+ lineObj.LineNumber +"-btn-terminate-conference-call\" style=\"display:none\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i> "+ lang.end_conference_call +"</button>";
    html += "</div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-conference-status\" class=callStatus style=\"margin-top:10px; display:none\">...</div>";
    html += "<audio id=\"line-"+ lineObj.LineNumber +"-conference-remoteAudio\" style=\"display:none\"></audio>";
    html += "</div>"; //-Conference

    // CRM
    html += "<div id=\"line-"+ lineObj.LineNumber +"-active-audio-call-crm-space\">"
    // Use this DIV for anything really. Call your own CRM, and have the results display here
    html += "</div>"; // crm

    html += "</div>"; //.CallUi
    html += "</div>"; //AudioCall

    // Video Call UI
    html += "<div id=\"line-"+ lineObj.LineNumber +"-VideoCall\" style=\"height:100%; display:none\">";
    // Video Preview
    html += "<div id=\"line-"+ lineObj.LineNumber +"-preview-container\" class=\"PreviewContainer cleanScroller\">";
    html += "<video id=\"line-"+ lineObj.LineNumber +"-localVideo\" muted playsinline></video>"; // Default Display
    html += "</div>";

    // Stage
    html += "<div id=\"line-"+ lineObj.LineNumber +"-stage-container\" class=StageContainer>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-remote-videos\" class=VideosContainer></div>";
    html += "<div id=\"line-"+ lineObj.LineNumber +"-scratchpad-container\" class=ScratchpadContainer style=\"display:none\"></div>";
    html += "<video id=\"line-"+ lineObj.LineNumber +"-sharevideo\" controls muted playsinline style=\"display:none; object-fit: contain; width: 100%;\"></video>";
    html += "</div>";
    html += "</div>"; //-VideoCall
    html += "</div>"; //-AudioOrVideoCall

    // In Call Control
    // ===============
    html += "<div class=CallControlContainer>";
    html += "<div class=CallControl>";
    html += "<div><button id=\"line-"+ lineObj.LineNumber +"-btn-ControlToggle\" onclick=\"ToggleMoreButtons('"+ lineObj.LineNumber +"')\" style=\"font-size:24px; width:80px\"><i class=\"fa fa-chevron-up\"></i></button></div>";
    // Visible Row
    html += "<div>";
    // Mute
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Mute\" onclick=\"MuteSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.mute +"\"><i class=\"fa fa-microphone-slash\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Unmute\" onclick=\"UnmuteSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.unmute +"\" style=\"color: red; display:none\"><i class=\"fa fa-microphone\"></i></button>";
    // Hold
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Hold\" onclick=\"holdSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\"  title=\""+ lang.hold_call +"\"><i class=\"fa fa-pause-circle\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Unhold\" onclick=\"unholdSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.resume_call +"\" style=\"color: red; display:none\"><i class=\"fa fa-play-circle\"></i></button>";

    if(direction == "outbound"){
        // DTMF
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-ShowDtmf\" onclick=\"ShowDtmfMenu('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.send_dtmf +"\"><i class=\"fa fa-keyboard-o\"></i></button>";
    } else {
        // Transfer (Audio Only)
        if(EnableTransfer){
            html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Transfer\" onclick=\"StartTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.transfer_call +"\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
            html += "<button id=\"line-"+ lineObj.LineNumber+"-btn-CancelTransfer\" onclick=\"CancelTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.cancel_transfer +"\" style=\"color: red; display:none\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
        }
    }

    // Expand UI (Video Only)
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-expand\" onclick=\"ExpandVideoArea('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\"><i class=\"fa fa-expand\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-restore\" onclick=\"RestoreVideoArea('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" style=\"display:none\"><i class=\"fa fa-compress\"></i></button>";
    // End Call
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-End\" onclick=\"endSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons hangupButton\" title=\""+ lang.end_call +"\"><i class=\"fa fa-phone\" style=\"transform: rotate(135deg);\"></i></button>";
    html += "</div>";
    // Row two (Hidden By Default)
    html += "<div id=\"line-"+ lineObj.LineNumber +"-btn-more\" style=\"display:none\">";
    // Record
    if(typeof MediaRecorder != "undefined" && (CallRecordingPolicy == "allow" || CallRecordingPolicy == "enabled")){
        // Safari: must enable in Develop > Experimental Features > MediaRecorder
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-start-recording\" onclick=\"StartRecording('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.start_call_recording +"\"><i class=\"fa fa-dot-circle-o\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-stop-recording\" onclick=\"StopRecording('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.stop_call_recording +"\" style=\"color: red; display:none\"><i class=\"fa fa-circle\"></i></button>";
    }
    // Conference
    if(EnableConference){
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Conference\" onclick=\"StartConferenceCall('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.conference_call +"\"><i class=\"fa fa-users\"></i></button>";
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-CancelConference\" onclick=\"CancelConference('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.cancel_conference +"\" style=\"color: red; display:none\"><i class=\"fa fa-users\"></i></button>";
    }
    if(direction == "outbound"){
        // Transfer (Audio Only)
        if(EnableTransfer){
            html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-Transfer\" onclick=\"StartTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.transfer_call +"\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
            html += "<button id=\"line-"+ lineObj.LineNumber+"-btn-CancelTransfer\" onclick=\"CancelTransferSession('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.cancel_transfer +"\" style=\"color: red; display:none\"><i class=\"fa fa-reply\" style=\"transform: rotateY(180deg)\"></i></button>";
        }
    } else {
        // DTMF
        html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-ShowDtmf\" onclick=\"ShowDtmfMenu('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.send_dtmf +"\"><i class=\"fa fa-keyboard-o\"></i></button>";
    }
    // Settings
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-settings\" onclick=\"ChangeSettings('"+ lineObj.LineNumber +"', this)\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.device_settings +"\"><i class=\"fa fa-volume-up\"></i></button>";
    // Present
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-present-src\" onclick=\"ShowPresentMenu(this, '"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.camera +"\"><i class=\"fa fa-video-camera\"></i></button>";
    // Call Stats
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-ShowCallStats\" onclick=\"ShowCallStats('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.call_stats +"\"><i class=\"fa fa-area-chart\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-HideCallStats\" onclick=\"HideCallStats('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.call_stats +"\" style=\"color: red; display:none\"><i class=\"fa fa-area-chart\"></i></button>";
    // Call Timeline
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-ShowTimeline\" onclick=\"ShowCallTimeline('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.activity_timeline +"\"><i class=\"fa fa-list-ul\"></i></button>";
    html += "<button id=\"line-"+ lineObj.LineNumber +"-btn-HideTimeline\" onclick=\"HideCallTimeline('"+ lineObj.LineNumber +"')\" class=\"roundButtons dialButtons inCallButtons\" title=\""+ lang.activity_timeline +"\" style=\"color: red; display:none\"><i class=\"fa fa-list-ul\"></i></button>";

    html += "</div>"; // More Buttons Row
    html += "</div>"; // .CallControl
    html += "</div>"; // .CallControlContainer

    // Screens - Note: They cannot occupy the same space.
    
    // Call Stats
    html += "<div id=\"line-"+ lineObj.LineNumber +"-AudioStats\" class=\"audioStats cleanScroller\" style=\"display:none\">";
    html += "<div>";
    html += "<div>"+ lang.send_statistics +"</div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioSendBitRate\" class=audioGraph></canvas></div>"
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioSendPacketRate\" class=audioGraph></canvas></div>";
    html += "</div>";
    html += "<div>";
    html += "<div>"+ lang.receive_statistics +"</div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveBitRate\" class=audioGraph></canvas></div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceivePacketRate\" class=audioGraph></canvas></div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceivePacketLoss\" class=audioGraph></canvas></div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveJitter\" class=audioGraph></canvas></div>";
    html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"line-"+ lineObj.LineNumber +"-AudioReceiveLevels\" class=audioGraph></canvas></div>";
    html += "</div>";
    html += "</div>";

    // Call Timeline
    html += "<div id=\"line-"+ lineObj.LineNumber +"-CallDetails\" class=\"callTimeline cleanScroller\" style=\"display:none\">";
    // In Call Activity
    html += "</div>";

    html += "</div>"; // Active Call UI


    html += "</td></tr>";
    html += "</table>";

    $("#rightContent").append(html);

    $("#line-"+ lineObj.LineNumber +"-AudioOrVideoCall").on("click", function(){
        RestoreCallControls(lineObj.LineNumber);
    });
}
function RemoveLine(lineObj){
    if(lineObj == null) return;

    var earlyReject = lineObj.SipSession.data.earlyReject;
    for(var l = 0; l < Lines.length; l++) {
        if(Lines[l].LineNumber == lineObj.LineNumber) {
            Lines.splice(l,1);
            break;
        }
    }

    if(earlyReject != true){
        CloseLine(lineObj.LineNumber);
        $("#line-ui-"+ lineObj.LineNumber).remove();
    }

    UpdateBuddyList();

    if(earlyReject != true){
        // Rather than showing nothing, go to the last Buddy Selected
        // Select Last user
        if(localDB.getItem("SelectedBuddy") != null){
            console.log("Selecting previously selected buddy...", localDB.getItem("SelectedBuddy"));
            SelectBuddy(localDB.getItem("SelectedBuddy"));
            UpdateUI();
        }
    } 
}
function CloseLine(lineNum){
    // Lines and Buddies (Left)
    $(".buddySelected").each(function () {
        $(this).prop('class', 'buddy');
    });
    // Streams (Right)
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });

    // SwitchLines(0);

    console.log("Closing Line: "+ lineNum);
    for(var l = 0; l < Lines.length; l++){
        Lines[l].IsSelected = false;
    }
    selectedLine = null;
    for(var b = 0; b < Buddies.length; b++){
        Buddies[b].IsSelected = false;
    }
    selectedBuddy = null;

    // Save Selected
    // localDB.setItem("SelectedBuddy", null);

    // Change to Stream if in Narrow view
    UpdateUI();
}
function SwitchLines(lineNum){
    $.each(userAgent.sessions, function (i, session) {
        // All the other calls, not on hold
        if(session.state == SIP.SessionState.Established){
            if(session.isOnHold == false && session.data.line != lineNum) {
                holdSession(session.data.line);
            }
        }
        session.data.IsCurrentCall = false;
    });

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj != null && lineObj.SipSession != null) {
        var session = lineObj.SipSession;
        if(session.state == SIP.SessionState.Established){
            if(session.isOnHold == true) {
                unholdSession(lineNum)
            }
        }
        session.data.IsCurrentCall = true;
    }
    selectedLine = lineNum;

    RefreshLineActivity(lineNum);
}
function RefreshLineActivity(lineNum){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) {
        return;
    }
    var session = lineObj.SipSession;

    $("#line-"+ lineNum +"-CallDetails").empty();

    var callDetails = [];

    var ringTime = 0;
    var CallStart = moment.utc(session.data.callstart.replace(" UTC", ""));
    var CallAnswer = null;
    if(session.data.startTime){
        CallAnswer = moment.utc(session.data.startTime);
        ringTime = moment.duration(CallAnswer.diff(CallStart));
    }
    CallStart = CallStart.format("YYYY-MM-DD HH:mm:ss UTC")
    CallAnswer = (CallAnswer)? CallAnswer.format("YYYY-MM-DD HH:mm:ss UTC") : null,
    ringTime = (ringTime != 0)? ringTime.asSeconds() : 0

    var srcCallerID = "";
    var dstCallerID = "";
    if(session.data.calldirection == "inbound") {
        srcCallerID = "<"+ session.remoteIdentity.uri.user +"> "+ session.remoteIdentity.displayName;
    } 
    else if(session.data.calldirection == "outbound") {
        dstCallerID = session.data.dst;
    }

    var withVideo = (session.data.withvideo)? "("+ lang.with_video +")" : "";
    var startCallMessage = (session.data.calldirection == "inbound")? lang.you_received_a_call_from + " " + srcCallerID  +" "+ withVideo : lang.you_made_a_call_to + " " + dstCallerID +" "+ withVideo;
    callDetails.push({ 
        Message: startCallMessage,
        TimeStr : CallStart
    });
    if(CallAnswer){
        var answerCallMessage = (session.data.calldirection == "inbound")? lang.you_answered_after + " " + ringTime + " " + lang.seconds_plural : lang.they_answered_after + " " + ringTime + " " + lang.seconds_plural;
        callDetails.push({ 
            Message: answerCallMessage,
            TimeStr : CallAnswer
        });
    }

    var Transfers = (session.data.transfer)? session.data.transfer : [];
    $.each(Transfers, function(item, transfer){
        var msg = (transfer.type == "Blind")? lang.you_started_a_blind_transfer_to +" "+ transfer.to +". " : lang.you_started_an_attended_transfer_to + " "+ transfer.to +". ";
        if(transfer.accept && transfer.accept.complete == true){
            msg += lang.the_call_was_completed
        }
        else if(transfer.accept.disposition != "") {
            msg += lang.the_call_was_not_completed +" ("+ transfer.accept.disposition +")"
        }
        callDetails.push({
            Message : msg,
            TimeStr : transfer.transferTime
        });
    });
    var Mutes = (session.data.mute)? session.data.mute : []
    $.each(Mutes, function(item, mute){
        callDetails.push({
            Message : (mute.event == "mute")? lang.you_put_the_call_on_mute : lang.you_took_the_call_off_mute,
            TimeStr : mute.eventTime
        });
    });
    var Holds = (session.data.hold)? session.data.hold : []
    $.each(Holds, function(item, hold){
        callDetails.push({
            Message : (hold.event == "hold")? lang.you_put_the_call_on_hold : lang.you_took_the_call_off_hold,
            TimeStr : hold.eventTime
        });
    });
    var ConfbridgeEvents = (session.data.ConfbridgeEvents)? session.data.ConfbridgeEvents : []
    $.each(ConfbridgeEvents, function(item, event){
        callDetails.push({
            Message : event.event,
            TimeStr : event.eventTime
        });
    });
    var Recordings = (session.data.recordings)? session.data.recordings : []
    $.each(Recordings, function(item, recording){
        var msg = lang.call_is_being_recorded;
        if(recording.startTime != recording.stopTime){
            msg += "("+ lang.now_stopped +")"
        }
        callDetails.push({
            Message : msg,
            TimeStr : recording.startTime
        });
    });
    var ConfCalls = (session.data.confcalls)? session.data.confcalls : []
    $.each(ConfCalls, function(item, confCall){
        var msg = lang.you_started_a_conference_call_to +" "+ confCall.to +". ";
        if(confCall.accept && confCall.accept.complete == true){
            msg += lang.the_call_was_completed
        }
        else if(confCall.accept.disposition != "") {
            msg += lang.the_call_was_not_completed +" ("+ confCall.accept.disposition +")"
        }
        callDetails.push({
            Message : msg,
            TimeStr : confCall.startTime
        });
    });

    callDetails.sort(function(a, b){
        var aMo = moment.utc(a.TimeStr.replace(" UTC", ""));
        var bMo = moment.utc(b.TimeStr.replace(" UTC", ""));
        if (aMo.isSameOrAfter(bMo, "second")) {
            return -1;
        } else return 1;
        return 0;
    });

    $.each(callDetails, function(item, detail){
        var Time = moment.utc(detail.TimeStr.replace(" UTC", "")).local().format(DisplayTimeFormat);
        var messageString = "<table class=timelineMessage cellspacing=0 cellpadding=0><tr>"
        messageString += "<td class=timelineMessageArea>"
        messageString += "<div class=timelineMessageDate><i class=\"fa fa-circle timelineMessageDot\"></i>"+ Time +"</div>"
        messageString += "<div class=timelineMessageText>"+ detail.Message +"</div>"
        messageString += "</td>"
        messageString += "</tr></table>";
        $("#line-"+ lineNum +"-CallDetails").prepend(messageString);
    });
}

// Buddy & Contacts
// ================
var Buddy = function(type, identity, CallerIDName, ExtNo, MobileNumber, ContactNumber1, ContactNumber2, lastActivity, desc, Email, jid, dnd, subscribe, subscription, autoDelete, pinned){
    this.type = type; // extension | xmpp | contact | group
    this.identity = identity;
    this.jid = jid;
    this.CallerIDName = (CallerIDName)? CallerIDName : "";
    this.Email = (Email)? Email : "" ;
    this.Desc = (desc)? desc : "" ;
    this.ExtNo = ExtNo;
    this.MobileNumber = MobileNumber;
    this.ContactNumber1 = ContactNumber1;
    this.ContactNumber2 = ContactNumber2;
    this.lastActivity = lastActivity; // Full Date as string eg "1208-03-21 15:34:23 UTC"
    this.devState = "dotOffline";
    this.presence = "Unknown";
    this.missed = 0;
    this.IsSelected = false;
    this.imageObjectURL = "";
    this.presenceText = lang.default_status;
    this.EnableDuringDnd = dnd;
    this.EnableSubscribe = subscribe;
    this.SubscribeUser = (subscription)? subscription : ExtNo;
    this.AllowAutoDelete = (typeof autoDelete !== 'undefined')? autoDelete : AutoDeleteDefault;
    this.Pinned = (typeof pinned !== 'undefined')? pinned : false;
}
function InitUserBuddies(){
    var template = { TotalRows:0, DataCollection:[] }
    localDB.setItem(profileUserID + "-Buddies", JSON.stringify(template));
    return JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
}

/**
 * Method used to create a permanent buddy (saved to the local store).
 * Note: This method also makes the memory object for display it on the left hand side, using AddBuddy()
 * @param {string} type One of extension | xmpp | contact | group
 * @param {boolean} update Option to issue UpdateBuddyList() once done.
 * @param {boolean} focus Option to focus/select the buddy once done.
 * @param {boolean} subscribe Option to create a subscription to the user. (also see subscribeUser)
 * @param {string} callerID The Display Name or Caller ID of the Buddy
 * @param {string} did The Extension Number/DID/SipID of the Buddy
 * @param {string} jid The Jabber Identifier of the XMPP buddy (only if type=xmpp)
 * @param {boolean} AllowDuringDnd Option to allowing inbound calls when on DND
 * @param {string} subscribeUser If subscribe=true, you can optionally specify a SipID to subscribe to.
 * @param {boolean} autoDelete Option to have this buddy delete after MaxBuddyAge
 * @param {boolean} addToXmppRoster Option if the buddy type is Xmpp, can automatically add to remote roster.
**/
function MakeBuddy(type, update, focus, subscribe, callerID, did, jid, AllowDuringDnd, subscribeUser, autoDelete, addToXmppRoster){
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json == null) json = InitUserBuddies();

    var dateNow = utcDateNow();
    var buddyObj = null;
    var id = uID();

    if(type == "extension") {
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
            jid: null,
            DisplayName: callerID,
            Description: "", 
            Email: "",
            MemberCount: 0,
            EnableDuringDnd: AllowDuringDnd,
            Subscribe: subscribe,
            SubscribeUser: subscribeUser,
            AutoDelete: autoDelete
        });
        buddyObj = new Buddy("extension", id, callerID, did, "", "", "", dateNow, "", "", null, AllowDuringDnd, subscribe, subscribeUser, autoDelete);
        AddBuddy(buddyObj, update, focus, subscribe, true);
    }
    if(type == "xmpp") {
        json.DataCollection.push({
            Type: "xmpp",
            LastActivity: dateNow,
            ExtensionNumber: did,
            MobileNumber: "",
            ContactNumber1: "",
            ContactNumber2: "",
            uID: id,
            cID: null,
            gID: null,
            jid: jid,
            DisplayName: callerID,
            Description: "", 
            Email: "",
            MemberCount: 0,
            EnableDuringDnd: AllowDuringDnd,
            Subscribe: subscribe,
            SubscribeUser: subscribeUser,
            AutoDelete: autoDelete
        });
        buddyObj = new Buddy("xmpp", id, callerID, did, "", "", "", dateNow, "", "", jid, AllowDuringDnd, subscribe, subscribeUser, autoDelete);
        if(addToXmppRoster == true){
            XmppAddBuddyToRoster(buddyObj);
        }
        AddBuddy(buddyObj, update, focus, subscribe, true);
    }
    if(type == "contact"){
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
            jid: null,
            DisplayName: callerID,
            Description: "",
            Email: "",
            MemberCount: 0,
            EnableDuringDnd: AllowDuringDnd,
            Subscribe: false,
            SubscribeUser: null,
            AutoDelete: autoDelete
        });
        buddyObj = new Buddy("contact", id, callerID, "", "", did, "", dateNow, "", "", null, AllowDuringDnd, false, null, autoDelete);
        AddBuddy(buddyObj, update, focus, false, true);
    }
    if(type == "group") {
        json.DataCollection.push({
            Type: "group",
            LastActivity: dateNow,
            ExtensionNumber: did,
            MobileNumber: "",
            ContactNumber1: "",
            ContactNumber2: "",
            uID: null,
            cID: null,
            gID: id,
            jid: null,
            DisplayName: callerID,
            Description: "", 
            Email: "",
            MemberCount: 0,
            EnableDuringDnd: false,
            Subscribe: false,
            SubscribeUser: null,
            AutoDelete: autoDelete
        });
        buddyObj = new Buddy("group", id, callerID, did, "", "", "", dateNow, "", "", null, false, false, null, autoDelete);
        AddBuddy(buddyObj, update, focus, false, true);
    }
    // Update Size: 
    json.TotalRows = json.DataCollection.length;

    // Save To DB
    localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));

    // Return new buddy
    return buddyObj;
}
function UpdateBuddyCallerID(buddyObj, callerID){
    buddyObj.CallerIDName = callerID;

    var buddy = buddyObj.identity;
    // Update DB
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json != null){
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
                item.DisplayName = callerID;
                return false;
            }
        });
        // Save To DB
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }

    UpdateBuddyList();
}
function AddBuddy(buddyObj, update, focus, subscribe, cleanup){
    Buddies.push(buddyObj);
    if(update == true) UpdateBuddyList();
    AddBuddyMessageStream(buddyObj);
    if(subscribe == true) SubscribeBuddy(buddyObj);
    if(focus == true) SelectBuddy(buddyObj.identity);
    if(cleanup == true) CleanupBuddies()
}
function CleanupBuddies(){
    if(MaxBuddyAge > 1 || MaxBuddies > 1){
        // Sort According to .lastActivity
        Buddies.sort(function(a, b){
            var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
            var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
            if (aMo.isSameOrAfter(bMo, "second")) {
                return -1;
            } else return 1;
            return 0;
        });

        if(MaxBuddyAge > 1){
            var expiredDate = moment.utc().subtract(MaxBuddyAge, 'days');
            console.log("Running Buddy Cleanup for activity older than: ", expiredDate.format(DisplayDateFormat+" "+DisplayTimeFormat));
            for (var b = Buddies.length - 1; b >= 0; b--) {
                var lastActivity = moment.utc(Buddies[b].lastActivity.replace(" UTC", ""));
                if(lastActivity.isSameOrAfter(expiredDate, "second")){
                    // This one is fine
                } else {
                    // Too Old
                    if(Buddies[b].AllowAutoDelete == true){
                        console.warn("This buddy is too old, and will be deleted: ", lastActivity.format(DisplayDateFormat+" "+DisplayTimeFormat));
                        DoRemoveBuddy(Buddies[b].identity);
                    }
                }
            }
        }
        if(MaxBuddies > 1 && MaxBuddies < Buddies.length){
            console.log("Running Buddy Cleanup for buddies more than: ", MaxBuddies);
            for (var b = Buddies.length - 1; b >= MaxBuddies; b--) {
                if(Buddies[b].AllowAutoDelete == true){
                    console.warn("This buddy is too Many, and will be deleted: ", Buddies[b].identity);
                    DoRemoveBuddy(Buddies[b].identity);
                }
            }
        }
    }
}
function PopulateBuddyList() {
    console.log("Clearing Buddies...");
    Buddies = new Array();
    console.log("Adding Buddies...");
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json == null) json = InitUserBuddies();

    console.log("Total Buddies: " + json.TotalRows);
    $.each(json.DataCollection, function (i, item) {
        item.AutoDelete = (item.AutoDelete == true)? true : false;
        item.Pinned = (item.Pinned == true)? true : false;
        if(item.Type == "extension"){
            // extension
            var buddy = new Buddy("extension", 
                                    item.uID, 
                                    item.DisplayName, 
                                    item.ExtensionNumber, 
                                    item.MobileNumber, 
                                    item.ContactNumber1, 
                                    item.ContactNumber2, 
                                    item.LastActivity, 
                                    item.Description, 
                                    item.Email, 
                                    null, 
                                    item.EnableDuringDnd, 
                                    item.Subscribe,
                                    item.SubscribeUser,
                                    item.AutoDelete,
                                    item.Pinned);
            AddBuddy(buddy, false, false, false);
        }
        else if(item.Type == "xmpp"){
            // xmpp
            var buddy = new Buddy("xmpp", 
                                    item.uID, 
                                    item.DisplayName, 
                                    item.ExtensionNumber, 
                                    "", 
                                    "", 
                                    "", 
                                    item.LastActivity, 
                                    "", 
                                    "", 
                                    item.jid, 
                                    item.EnableDuringDnd, 
                                    item.Subscribe,
                                    item.SubscribeUser,
                                    item.AutoDelete,
                                    item.Pinned);
            AddBuddy(buddy, false, false, false);
        }
        else if(item.Type == "contact"){
            // contact
            var buddy = new Buddy("contact", 
                                    item.cID, 
                                    item.DisplayName, 
                                    "", 
                                    item.MobileNumber, 
                                    item.ContactNumber1, 
                                    item.ContactNumber2, 
                                    item.LastActivity, 
                                    item.Description, 
                                    item.Email, 
                                    null, 
                                    item.EnableDuringDnd, 
                                    item.Subscribe,
                                    item.SubscribeUser,
                                    item.AutoDelete,
                                    item.Pinned);
            AddBuddy(buddy, false, false, false);
        }
        else if(item.Type == "group"){
            // group
            var buddy = new Buddy("group", 
                                    item.gID, 
                                    item.DisplayName, 
                                    item.ExtensionNumber, 
                                    "", 
                                    "", 
                                    "", 
                                    item.LastActivity, 
                                    item.MemberCount + " member(s)", 
                                    item.Email, 
                                    null, 
                                    item.EnableDuringDnd, 
                                    item.Subscribe,
                                    item.SubscribeUser,
                                    item.AutoDelete,
                                    item.Pinned);
            AddBuddy(buddy, false, false, false);
        }
    });
    CleanupBuddies()

    // Update List (after add)
    console.log("Updating Buddy List...");
    UpdateBuddyList();
}
function UpdateBuddyList(){
    var filter = $("#txtFindBuddy").val();

    $("#myContacts").empty();

    // Show Lines
    var callCount = 0
    for(var l = 0; l < Lines.length; l++) {

        var classStr = (Lines[l].IsSelected)? "buddySelected" : "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.isOnHold)? "buddyActiveCallHollding" : "buddyActiveCall";

        var html = "<div id=\"line-"+ Lines[l].LineNumber +"\" class="+ classStr +" onclick=\"SelectLine('"+ Lines[l].LineNumber +"')\">";
        if(Lines[l].IsSelected == false && Lines[l].SipSession && Lines[l].SipSession.data.started != true && Lines[l].SipSession.data.calldirection == "inbound"){
            html += "<span id=\"line-"+ Lines[l].LineNumber +"-ringing\" class=missedNotifyer style=\"padding-left: 5px; padding-right: 5px; width:unset\"><i class=\"fa fa-phone\"></i> "+ lang.state_ringing +"</span>";
        }
        html += "<div class=lineIcon>"+ (l + 1) +"</div>";
        html += "<div class=contactNameText><i class=\"fa fa-phone\"></i> "+ lang.line +" "+ (l + 1) +"</div>";
        html += "<div id=\"line-"+ Lines[l].LineNumber +"-datetime\" class=contactDate>&nbsp;</div>";
        html += "<div class=presenceText>"+ Lines[l].DisplayName +" <"+ Lines[l].DisplayNumber +">" +"</div>";
        html += "</div>";
        // SIP.Session.C.STATUS_TERMINATED
        if(Lines[l].SipSession && Lines[l].SipSession.data.earlyReject != true){
            $("#myContacts").append(html);
            callCount ++;
        }
    }

    // End here if they are not using the buddy system
    if(DisableBuddies == true){
        // If there are no calls, show the dial pad (if you are allowed)
        if(callCount == 0 && DisableFreeDial != true){
            if(UiCustomDialButton == true){
                if(typeof web_hook_dial_out !== 'undefined') {
                    web_hook_dial_out(null);
                }
            } else {
                ShowDial();
            }
        }
        return;
    }

    // Draw a line if there are calls
    if(callCount > 0){
        $("#myContacts").append("<hr class=hrline>");
    }

    // If there are no buddies, and no calls, then, show the dial pad (if you are allowed)
    if(Buddies.length == 0 && callCount == 0 && DisableFreeDial != true){
        console.warn("You have no buddies, will show the Dial Screen rather");
        if(UiCustomDialButton == true){
            if(typeof web_hook_dial_out !== 'undefined') {
                web_hook_dial_out(null);
            }
        } else {
            ShowDial();
        }
        return;
    }

    // Sort and filter
    SortBuddies();

    var hiddenBuddies = 0;

    // Display
    for(var b = 0; b < Buddies.length; b++) {
        var buddyObj = Buddies[b];

        if(filter && filter.length >= 1){
            // Perform Filter Display
            var display = false;
            if(buddyObj.CallerIDName && buddyObj.CallerIDName.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.ExtNo && buddyObj.ExtNo.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(buddyObj.Desc && buddyObj.Desc.toLowerCase().indexOf(filter.toLowerCase()) > -1 ) display = true;
            if(!display) continue;
        }

        var today = moment.utc();
        var lastActivity = moment.utc(buddyObj.lastActivity.replace(" UTC", ""));
        var displayDateTime = "";
        if(lastActivity.isSame(today, 'day'))
        {
            displayDateTime = lastActivity.local().format(DisplayTimeFormat);
        } 
        else {
            displayDateTime = lastActivity.local().format(DisplayDateFormat);
        }

        if(HideAutoDeleteBuddies){
            if(buddyObj.AllowAutoDelete) {
                hiddenBuddies++;
                continue;
            }
        }

        var classStr = (buddyObj.IsSelected)? "buddySelected" : "buddy";
        if(buddyObj.type == "extension") { 
            var friendlyState = buddyObj.presence;
            if(friendlyState == "Unknown") friendlyState = lang.state_unknown;
            if(friendlyState == "Not online") friendlyState = lang.state_not_online;
            if(friendlyState == "Ready") friendlyState = lang.state_ready;
            if(friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
            if(friendlyState == "Proceeding") friendlyState = lang.state_on_the_phone;
            if(friendlyState == "Ringing") friendlyState = lang.state_ringing;
            if(friendlyState == "On hold") friendlyState = lang.state_on_hold;
            if(friendlyState == "Unavailable") friendlyState = lang.state_unavailable;
            if(buddyObj.EnableSubscribe != true) friendlyState = (buddyObj.Desc)? buddyObj.Desc : "";
            var autDeleteStatus = "";
            if(buddyObj.AllowAutoDelete == true) autDeleteStatus = "<i class=\"fa fa-clock-o\"></i> ";
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'extension')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\""+ ((buddyObj.missed && buddyObj.missed > 0)? "" : "display:none") +"\">"+ buddyObj.missed +"</span>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-picture\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity, buddyObj.type) +"')\"></div>";
            html += (buddyObj.Pinned)? "<span class=pinnedBuddy><i class=\"fa fa-thumb-tack\"></i></span>" : "";
            html += "<div class=contactNameText>";
            html += "<span id=\"contact-"+ buddyObj.identity +"-devstate\" class=\""+ ((buddyObj.EnableSubscribe)? buddyObj.devState : "dotDefault") +"\"></span>";
            html += (BuddyShowExtenNum == true)? " "+ buddyObj.ExtNo + " - " : " ";
            html += buddyObj.CallerIDName
            html += "</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ autDeleteStatus + ""+ displayDateTime +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-presence\" class=presenceText>"+ friendlyState +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "xmpp") { 
            var friendlyState = buddyObj.presenceText;
            var autDeleteStatus = "";
            if(buddyObj.AllowAutoDelete == true) autDeleteStatus = "<i class=\"fa fa-clock-o\"></i> ";
            // NOTE: Set by user could contain malicious code
            friendlyState = friendlyState.replace(/[<>"'\r\n&]/g, function(chr){
                let table = { '<': 'lt', '>': 'gt', '"': 'quot', '\'': 'apos', '&': 'amp', '\r': '#10', '\n': '#13' };
                return '&' + table[chr] + ';';
            });
            
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'extension')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\""+ ((buddyObj.missed && buddyObj.missed > 0)? "" : "display:none") +"\">"+ buddyObj.missed +"</span>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-picture\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity, buddyObj.type) +"')\"></div>";
            html += (buddyObj.Pinned)? "<span class=pinnedBuddy><i class=\"fa fa-thumb-tack\"></i></span>" : "";
            html += "<div class=contactNameText>";
            html += "<span id=\"contact-"+ buddyObj.identity +"-devstate\" class=\""+ ((buddyObj.EnableSubscribe)? buddyObj.devState : "dotDefault") +"\"></span>";
            html += (BuddyShowExtenNum == true)? " "+ buddyObj.ExtNo + " - " : " ";
            html += buddyObj.CallerIDName;
            html += "</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ autDeleteStatus + ""+ displayDateTime +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-presence\" class=presenceText><i class=\"fa fa-comments\"></i> "+ friendlyState +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-chatstate-menu\" class=presenceText style=\"display:none\"><i class=\"fa fa-commenting-o\"></i> "+ buddyObj.CallerIDName +" "+ lang.is_typing +"...</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "contact") { 
            var autDeleteStatus = "";
            if(buddyObj.AllowAutoDelete == true) autDeleteStatus = "<i class=\"fa fa-clock-o\"></i> ";
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'contact')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\""+ ((buddyObj.missed && buddyObj.missed > 0)? "" : "display:none") +"\">"+ buddyObj.missed +"</span>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-picture\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity, buddyObj.type) +"')\"></div>";
            html += (buddyObj.Pinned)? "<span class=pinnedBuddy><i class=\"fa fa-thumb-tack\"></i></span>" : "";
            html += "<div class=contactNameText><i class=\"fa fa-address-card\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ autDeleteStatus + ""+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        } else if(buddyObj.type == "group"){ 
            var autDeleteStatus = "";
            if(buddyObj.AllowAutoDelete == true) autDeleteStatus = "<i class=\"fa fa-clock-o\"></i> ";
            var html = "<div id=\"contact-"+ buddyObj.identity +"\" class="+ classStr +" onclick=\"SelectBuddy('"+ buddyObj.identity +"', 'group')\">";
            html += "<span id=\"contact-"+ buddyObj.identity +"-missed\" class=missedNotifyer style=\""+ ((buddyObj.missed && buddyObj.missed > 0)? "" : "display:none") +"\">"+ buddyObj.missed +"</span>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-picture\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity, buddyObj.type) +"')\"></div>";
            html += (buddyObj.Pinned)? "<span class=pinnedBuddy><i class=\"fa fa-thumb-tack\"></i></span>" : "";
            html += "<div class=contactNameText><i class=\"fa fa-users\"></i> "+ buddyObj.CallerIDName +"</div>";
            html += "<div id=\"contact-"+ buddyObj.identity +"-datetime\" class=contactDate>"+ autDeleteStatus + ""+ displayDateTime +"</div>";
            html += "<div class=presenceText>"+ buddyObj.Desc +"</div>";
            html += "</div>";
            $("#myContacts").append(html);
        }
    }
    if(hiddenBuddies > 0){
        console.warn("Auto Delete Buddies not shown", hiddenBuddies);
        var html = "<div id=hiddenBuddies class=hiddenBuddiesText>("+ lang.sort_no_showing.replace("{0}", hiddenBuddies) +")</div>";
        $("#myContacts").append(html);
        $("#hiddenBuddies").on("click", function(){
            HideAutoDeleteBuddies = false;
            // Show now, but leave default set in storage
            UpdateBuddyList();
        });
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

    // Profile Etc Row
    // ----------------------------------------------------------
    var profileRow = "";
    profileRow += "<tr><td id=\"contact-"+ buddyObj.identity +"-ProfileCell\" class=\"streamSection highlightSection buddyProfileSection\" style=\"height: 50px; box-sizing: border-box;\">";

    // Left Content - Profile
    profileRow += "<table cellpadding=0 cellspacing=0 border=0 style=\"width:100%; table-layout: fixed;\">"
    profileRow += "<tr>"
    // Close|Return|Back Button
    profileRow += "<td style=\"width:38px; text-align: center;\">";
    profileRow += "<button id=\"contact-"+ buddyObj.identity +"-btn-back\" onclick=\"CloseBuddy('"+ buddyObj.identity +"')\" class=roundButtons style=\"margin-right:5px\" title=\""+ lang.back +"\"><i class=\"fa fa-chevron-left\"></i></button> ";
    profileRow += "</td>"
    
    // Profile UI
    profileRow += "<td style=\"width:100%\">";
    profileRow += "<div class=contact style=\"cursor: unset; padding:0px\">";
    if(buddyObj.type == "extension" || buddyObj.type == "xmpp") {
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-picture-main\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity) +"')\"></div>";
    }
    else if(buddyObj.type == "contact") {
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-picture-main\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"contact") +"')\"></div>";
    }
    else if(buddyObj.type == "group") {
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-picture-main\" class=buddyIcon style=\"background-image: url('"+ getPicture(buddyObj.identity,"group") +"')\"></div>";
    }
    // Caller ID
    if(buddyObj.type == "extension" || buddyObj.type == "xmpp") {
        profileRow += "<div class=contactNameText style=\"margin-right: 0px;\">";
        profileRow += "<span id=\"contact-"+ buddyObj.identity +"-devstate-main\" class=\""+ buddyObj.devState +"\"></span>";
        profileRow += " <span id=\"contact-"+ buddyObj.identity +"-name\">"+ buddyObj.CallerIDName +"</span>";
        profileRow += "</div>";
    }
    else if(buddyObj.type == "contact") {
        profileRow += "<div class=contactNameText style=\"margin-right: 0px;\">"
        profileRow += "<i class=\"fa fa-address-card\"></i>";
        profileRow += " <span id=\"contact-"+ buddyObj.identity +"-name\">"+ buddyObj.CallerIDName +"</span>";
        profileRow += "</div>";
    } 
    else if(buddyObj.type == "group") {
        profileRow += "<div class=contactNameText style=\"margin-right: 0px;\">"
        profileRow += "<i class=\"fa fa-users\"></i>";
        profileRow += " <span id=\"contact-"+ buddyObj.identity +"-name\">"+ buddyObj.CallerIDName +"</span>";
        profileRow += "</div>";
    }
    // Presence
    if(buddyObj.type == "extension") {
        var friendlyState = buddyObj.presence;
        if (friendlyState == "Unknown") friendlyState = lang.state_unknown;
        if (friendlyState == "Not online") friendlyState = lang.state_not_online;
        if (friendlyState == "Ready") friendlyState = lang.state_ready;
        if (friendlyState == "On the phone") friendlyState = lang.state_on_the_phone;
        if (friendlyState == "Ringing") friendlyState = lang.state_ringing;
        if (friendlyState == "On hold") friendlyState = lang.state_on_hold;
        if (friendlyState == "Unavailable") friendlyState = lang.state_unavailable;
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText>"+ friendlyState +"</div>";
    } 
    else if(buddyObj.type == "xmpp"){
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText><i class=\"fa fa-comments\"></i> "+ buddyObj.presenceText +"</div>";
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-chatstate-main\" class=presenceText style=\"display:none\"><i class=\"fa fa-commenting-o\"></i> "+ buddyObj.CallerIDName +" "+ lang.is_typing +"...</div>";
    }
    else{
        profileRow += "<div id=\"contact-"+ buddyObj.identity +"-presence-main\" class=presenceText>"+ buddyObj.Desc +"</div>";
    }
    profileRow += "</div>";
    profileRow += "</td>";

    // Right Content - Action Buttons
    var buttonsWidth = 80; // 1 button = 34px ~40px
    if((buddyObj.type == "extension" || buddyObj.type == "xmpp") && EnableVideoCalling == true) {
        buttonsWidth = 120;
    }
    var fullButtonsWidth = 200;
    if((buddyObj.type == "extension" || buddyObj.type == "xmpp") && EnableVideoCalling == true) {
        fullButtonsWidth = 240;
    }
    profileRow += "<td id=\"contact-"+ buddyObj.identity +"-action-buttons\" style=\"width: "+ buttonsWidth +"px; text-align: right\">";
    profileRow += "<button id=\"contact-"+ buddyObj.identity +"-btn-audioCall\" onclick=\"AudioCallMenu('"+ buddyObj.identity +"', this)\" class=roundButtons title=\""+ lang.audio_call +"\"><i class=\"fa fa-phone\"></i></button>";
    if((buddyObj.type == "extension" || buddyObj.type == "xmpp") && EnableVideoCalling == true) {
        profileRow += " <button id=\"contact-"+ buddyObj.identity +"-btn-videoCall\" onclick=\"DialByLine('video', '"+ buddyObj.identity +"', '"+ buddyObj.ExtNo +"');\" class=roundButtons title=\""+ lang.video_call +"\"><i class=\"fa fa-video-camera\"></i></button>";
    }
    profileRow += "<span id=\"contact-"+ buddyObj.identity +"-extra-buttons\" style=\"display:none\">"
    profileRow += " <button id=\"contact-"+ buddyObj.identity +"-btn-edit\" onclick=\"EditBuddyWindow('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.edit +"\"><i class=\"fa fa-pencil\"></i></button>";
    profileRow += " <button id=\"contact-"+ buddyObj.identity +"-btn-search\" onclick=\"FindSomething('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.find_something +"\"><i class=\"fa fa-search\"></i></button>";
    profileRow += " <button id=\"contact-"+ buddyObj.identity +"-btn-pin\" onclick=\"TogglePinned('"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.pin_to_top +"\"><i class=\"fa fa-thumb-tack\"></i></button>";
    profileRow += "</span>"
    profileRow += " <button id=\"contact-"+ buddyObj.identity +"-btn-toggle-extra\" onclick=\"ToggleExtraButtons('"+ buddyObj.identity +"', "+ buttonsWidth +", "+ fullButtonsWidth +")\" class=roundButtons><i class=\"fa fa-ellipsis-h\"></i></button>";
    profileRow += "</td>";

    profileRow += "</tr></table>";
    profileRow += "</div>";

    // Separator
    profileRow += "<div style=\"clear:both; height:0px\"></div>"

    // Search & Related Elements
    profileRow += "<div id=\"contact-"+ buddyObj.identity +"-search\" style=\"margin-top:6px; display:none\">";
    profileRow += "<span class=searchClean style=\"width:100%\"><input type=text style=\"width: calc(100% - 40px);\" autocomplete=none oninput=SearchStream(this,'"+ buddyObj.identity +"') placeholder=\""+ lang.find_something_in_the_message_stream +"\"></span>";
    profileRow += "</div>";

    profileRow += "</td></tr>";

    // Messages Row
    // ----------------------------------------------------------
    var messagesRow = ""
    messagesRow += "<tr><td id=\"contact-"+ buddyObj.identity +"-MessagesCell\" class=\"streamSection streamSectionBackground wallpaperBackground buddyMessageSection\">";
    messagesRow += "<div id=\"contact-"+ buddyObj.identity +"-ChatHistory\" class=\"chatHistory cleanScroller\" ondragenter=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragover=\"setupDragDrop(event, '"+ buddyObj.identity +"')\" ondragleave=\"cancelDragDrop(event, '"+ buddyObj.identity +"')\" ondrop=\"onFileDragDrop(event, '"+ buddyObj.identity +"')\">";
    // Previous Chat messages
    messagesRow += "</div>";
    messagesRow += "</td></tr>";

    // Interaction row
    // ----------------------------------------------------------
    var textRow = ""
    if((buddyObj.type == "extension" || buddyObj.type == "xmpp" || buddyObj.type == "group") && EnableTextMessaging) {
        textRow += "<tr><td id=\"contact-"+ buddyObj.identity +"-InteractionCell\" class=\"streamSection highlightSection buddyInteractionSection\" style=\"height:80px\">";

        // Send Paste Image
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-imagePastePreview\" class=sendImagePreview style=\"display:none\" tabindex=0></div>";
        // Preview
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-msgPreview\" class=sendMessagePreview style=\"display:none\">"
        textRow += "<table class=sendMessagePreviewContainer cellpadding=0 cellspacing=0><tr>";
        textRow += "<td style=\"text-align:right\"><div id=\"contact-"+ buddyObj.identity +"-msgPreviewhtml\" class=\"sendMessagePreviewHtml cleanScroller\"></div></td>"
        textRow += "<td style=\"width:40px\"><button onclick=\"SendChatMessage('"+ buddyObj.identity +"')\" class=\"roundButtons\" title=\""+ lang.send +"\"><i class=\"fa fa-paper-plane\"></i></button></td>"
        textRow += "</tr></table>";
        textRow += "</div>";

        // Send File
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-fileShare\" style=\"display:none\">";
        textRow += "<input type=file multiple onchange=\"console.log(this)\" />";
        textRow += "</div>";

        // Send Audio Recording
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-audio-recording\" style=\"display:none\"></div>";

        // Send Video Recording
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-video-recording\" style=\"display:none\"></div>";

        // Dictate Message
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-dictate-message\" style=\"display:none\"></div>";

        // Emoji Menu Bar
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-emoji-menu\" style=\"display:none\"></div>";

        // ChatState
        textRow += "<div id=\"contact-"+ buddyObj.identity +"-chatstate\" style=\"display:none\"><i class=\"fa fa-commenting-o\"></i> "+ buddyObj.CallerIDName +" "+ lang.is_typing +"...</div>";

        // Type Area
        textRow += "<table class=sendMessageContainer cellpadding=0 cellspacing=0><tr>";
        textRow += "<td id=\"contact-"+ buddyObj.identity +"-add-menu\" class=MessageActions style=\"width:40px\"><button onclick=\"AddMenu(this, '"+ buddyObj.identity +"')\" class=roundButtons title=\""+ lang.menu +"\"><i class=\"fa fa-ellipsis-h\"></i></button></td>";
        textRow += "<td><textarea id=\"contact-"+ buddyObj.identity +"-ChatMessage\" class=\"chatMessage cleanScroller\" placeholder=\""+ lang.type_your_message_here +"\" onkeydown=\"chatOnkeydown(event, this,'"+ buddyObj.identity +"')\" oninput=\"chatOnInput(event, this,'"+ buddyObj.identity +"')\" onpaste=\"chatOnbeforepaste(event, this,'"+ buddyObj.identity +"')\"></textarea></td>";
        textRow += "<td id=\"contact-"+ buddyObj.identity +"-sendMessageButtons\" style=\"width:40px; display:none\"><button onclick=\"SendChatMessage('"+ buddyObj.identity +"')\" class=\"roundButtons\" title=\""+ lang.send +"\"><i class=\"fa fa-paper-plane\"></i></button></td>"
        textRow += "</tr></table>";
        
        textRow += "</td></tr>";
    }

    var html = "<table id=\"stream-"+ buddyObj.identity +"\" class=stream cellspacing=0 cellpadding=0>";
    if(UiMessageLayout == "top"){
        html += messagesRow;
        html += profileRow;
    } else {
        html += profileRow;
        html += messagesRow;
    }
    html += textRow;
    html += "</table>";

    $("#rightContent").append(html);
    if(UiMessageLayout == "top"){
        $("#contact-"+ buddyObj.identity +"-MessagesCell").addClass("")
        $("#contact-"+ buddyObj.identity +"-ProfileCell").addClass("sectionBorderTop")
        $("#contact-"+ buddyObj.identity +"-InteractionCell").addClass("")
    } else {
        $("#contact-"+ buddyObj.identity +"-ProfileCell").addClass("sectionBorderBottom")
        $("#contact-"+ buddyObj.identity +"-MessagesCell").addClass("")
        $("#contact-"+ buddyObj.identity +"-InteractionCell").addClass("sectionBorderTop")
    }


}
function RemoveBuddyMessageStream(buddyObj, days){
    // use days to specify how many days back must the records be cleared
    // eg: 30, will only remove records older than 30 day from now
    // and leave the buddy in place.
    // Must be greater then 0 or the entire buddy will be removed.
    if(buddyObj == null) return;

    // Grab a copy of the stream
    var stream = JSON.parse(localDB.getItem(buddyObj.identity + "-stream"));
    if(days && days > 0){
        if(stream && stream.DataCollection && stream.DataCollection.length >= 1){

            // Create Trim Stream 
            var trimmedStream = {
                TotalRows : 0,
                DataCollection : []
            }
            trimmedStream.DataCollection = stream.DataCollection.filter(function(item){
                // Apply Date Filter
                var itemDate = moment.utc(item.ItemDate.replace(" UTC", ""));
                var expiredDate = moment().utc().subtract(days, 'days');
                // Condition
                if(itemDate.isSameOrAfter(expiredDate, "second")){
                    return true // return true to include;
                }
                else {
                    return false; // return false to exclude;
                }
            });
            trimmedStream.TotalRows = trimmedStream.DataCollection.length;
            localDB.setItem(buddyObj.identity + "-stream", JSON.stringify(trimmedStream));

            // Create Delete Stream
            var deleteStream = {
                TotalRows : 0,
                DataCollection : []
            }
            deleteStream.DataCollection = stream.DataCollection.filter(function(item){
                // Apply Date Filter
                var itemDate = moment.utc(item.ItemDate.replace(" UTC", ""));
                var expiredDate = moment().utc().subtract(days, 'days');
                // Condition
                if(itemDate.isSameOrAfter(expiredDate, "second")){
                    return false; // return false to exclude;
                }
                else {
                    return true // return true to include;
                }
            });
            deleteStream.TotalRows = deleteStream.DataCollection.length;

            // Re-assign stream so that the normal delete action can apply
            stream = deleteStream;

            RefreshStream(buddyObj);
        }
    }
    else {
        CloseBuddy(buddyObj.identity);

        // Remove From UI
        $("#stream-"+ buddyObj.identity).remove();

        // Remove Stream (CDRs & Messages etc)
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
    }
    UpdateBuddyList();

    // Remove Call Recordings
    if(stream && stream.DataCollection && stream.DataCollection.length >= 1){
        DeleteCallRecordings(buddyObj.identity, stream);
    }
    
    // Remove QOS Data
    if(stream && stream.DataCollection && stream.DataCollection.length >= 1){
        DeleteQosData(buddyObj.identity, stream);
    }
}
function DeleteCallRecordings(buddy, stream){
    if(CallRecordingsIndexDb != null){
        // Loop and Delete
        // Note: This database can only delete based on Primary Key
        // The Primary Key is arbitrary, but is saved in item.Recordings.uID
        $.each(stream.DataCollection, function (i, item) {
            if (item.ItemType == "CDR" && item.Recordings && item.Recordings.length) {
                $.each(item.Recordings, function (i, recording) {
                    console.log("Deleting Call Recording: ", recording.uID);
                    var objectStore = CallRecordingsIndexDb.transaction(["Recordings"], "readwrite").objectStore("Recordings");
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
    else {
        console.warn("CallRecordingsIndexDb is null.");
    }
}
function ToggleExtraButtons(lineNum, normal, expanded){
    var extraButtons = $("#contact-"+ lineNum +"-extra-buttons");
    if(extraButtons.is(":visible")){
        // Restore
        extraButtons.hide()
        $("#contact-"+ lineNum +"-action-buttons").css("width", normal+"px");
    } else {
        // Expand
        extraButtons.show()
        $("#contact-"+ lineNum +"-action-buttons").css("width", expanded+"px");
    }
}
function SortBuddies(){

    // Firstly: Type - Second: Last Activity
    if(BuddySortBy == "type"){
        Buddies.sort(function(a, b){
            var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
            var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
            // contact | extension | (group) | xmpp
            var aType = a.type;
            var bType = b.type;
            // No groups for now
            if(SortByTypeOrder == "c|e|x") {
                if(a.type == "contact") aType = "A";
                if(b.type == "contact") bType = "A";
                if(a.type == "extension") aType = "B";
                if(b.type == "extension") bType = "B";
                if(a.type == "xmpp") aType = "C";
                if(b.type == "xmpp") bType = "C";
            }
            if(SortByTypeOrder == "c|x|e") {
                if(a.type == "contact") aType = "A";
                if(b.type == "contact") bType = "A";
                if(a.type == "extension") aType = "C";
                if(b.type == "extension") bType = "C";
                if(a.type == "xmpp") aType = "B";
                if(b.type == "xmpp") bType = "B";
            }
            if(SortByTypeOrder == "x|e|c") {
                if(a.type == "contact") aType = "C";
                if(b.type == "contact") bType = "C";
                if(a.type == "extension") aType = "B";
                if(b.type == "extension") bType = "B";
                if(a.type == "xmpp") aType = "A";
                if(b.type == "xmpp") bType = "A";
            }
            if(SortByTypeOrder == "x|c|e") {
                if(a.type == "contact") aType = "B";
                if(b.type == "contact") bType = "B";
                if(a.type == "extension") aType = "C";
                if(b.type == "extension") bType = "C";
                if(a.type == "xmpp") aType = "A";
                if(b.type == "xmpp") bType = "A";
            }
            if(SortByTypeOrder == "e|x|c") {
                if(a.type == "contact") aType = "C";
                if(b.type == "contact") bType = "C";
                if(a.type == "extension") aType = "A";
                if(b.type == "extension") bType = "A";
                if(a.type == "xmpp") aType = "B";
                if(b.type == "xmpp") bType = "B";
            }
            if(SortByTypeOrder == "e|c|x") {
                if(a.type == "contact") aType = "B";
                if(b.type == "contact") bType = "A";
                if(a.type == "extension") aType = "A";
                if(b.type == "extension") bType = "A";
                if(a.type == "xmpp") aType = "C";
                if(b.type == "xmpp") bType = "C";
            }

            return (aType.localeCompare(bType) || (aMo.isSameOrAfter(bMo, "second")? -1 : 1));
        });
    }

    // Extension Number (or Contact Number) - Second: Last Activity
    if(BuddySortBy == "extension"){
        Buddies.sort(function(a, b){
            var aSortBy = (a.type == "extension" || a.type == "xmpp")? a.ExtNo : a.ContactNumber1;
            var bSortBy = (b.type == "extension" || b.type == "xmpp")? b.ExtNo : a.ContactNumber1;
            var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
            var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
            return (aSortBy.localeCompare(bSortBy) || (aMo.isSameOrAfter(bMo, "second")? -1 : 1));
        });
    }

    // Name Alphabetically - Second: Last Activity
    if(BuddySortBy == "alphabetical"){
        Buddies.sort(function(a, b){
            var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
            var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
            return (a.CallerIDName.localeCompare(b.CallerIDName) || (aMo.isSameOrAfter(bMo, "second")? -1 : 1));
        });
    }

    // Last Activity Only
    if(BuddySortBy == "activity"){
        Buddies.sort(function(a, b){
            var aMo = moment.utc(a.lastActivity.replace(" UTC", ""));
            var bMo = moment.utc(b.lastActivity.replace(" UTC", ""));
            return (aMo.isSameOrAfter(bMo, "second")? -1 : 1);
        });
    }

    // Second Sorts

    // Sort Auto Delete
    if(BuddyAutoDeleteAtEnd == true){
        Buddies.sort(function(a, b){
            return (a.AllowAutoDelete === b.AllowAutoDelete)? 0 : a.AllowAutoDelete? 1 : -1;
        });
    }
    // Sort Out Pinned
    Buddies.sort(function(a, b){
        return (a.Pinned === b.Pinned)? 0 : a.Pinned? -1 : 1;
    });
    
}


function SelectBuddy(buddy) {
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    var displayName = (BuddyShowExtenNum == true && (buddyObj.type == "extension" || buddyObj.type == "xmpp"))? " "+ buddyObj.ExtNo + " - " + buddyObj.CallerIDName : buddyObj.CallerIDName;
    $("#contact-" + buddyObj.identity + "-name").html(displayName);
    var presence = "";
    if(buddyObj.type == "extension"){
        presence += buddyObj.presence;
        if(presence == "Unknown") presence = lang.state_unknown;
        if(presence == "Not online") presence = lang.state_not_online;
        if(presence == "Ready") presence = lang.state_ready;
        if(presence == "On the phone") presence = lang.state_on_the_phone;
        if(presence == "Ringing") presence = lang.state_ringing;
        if(presence == "On hold") presence = lang.state_on_hold;
        if(presence == "Unavailable") presence = lang.state_unavailable;
        if(buddyObj.EnableSubscribe != true) presence = buddyObj.Desc;
    } else if(buddyObj.type == "xmpp"){
        presence += "<i class=\"fa fa-comments\"></i> ";
        presence += buddyObj.presenceText;
    } else if(buddyObj.type == "contact"){
        presence += buddyObj.Desc;
    } else if(buddyObj.type == "group"){
        presence += buddyObj.Desc;
    }
    $("#contact-" + buddyObj.identity + "-presence-main").html(presence);

    $("#contact-"+ buddyObj.identity +"-picture-main").css("background-image", $("#contact-"+ buddyObj.identity +"-picture-main").css("background-image"));

    for(var b = 0; b < Buddies.length; b++) {
        if(Buddies[b].IsSelected == true && Buddies[b].identity == buddy){
            // Nothing to do, you re-selected the same buddy;
            return;
        }
    }

    console.log("Selecting Buddy: "+ buddyObj.CallerIDName);

    selectedBuddy = buddyObj;

    // Can only display one thing on the Right
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });
    $("#stream-" + buddy).prop('class', 'streamSelected');

    // Update Lines List
    for(var l = 0; l < Lines.length; l++) {
        var classStr = "buddy";
        if(Lines[l].SipSession != null) classStr = (Lines[l].SipSession.isOnHold)? "buddyActiveCallHollding" : "buddyActiveCall";
        $("#line-" + Lines[l].LineNumber).prop('class', classStr);
        Lines[l].IsSelected = false;
    }

    ClearMissedBadge(buddy);
    // Update Buddy List
    for(var b = 0; b < Buddies.length; b++) {
        var classStr = (Buddies[b].identity == buddy)? "buddySelected" : "buddy";
        $("#contact-" + Buddies[b].identity).prop('class', classStr);

        $("#contact-"+ Buddies[b].identity +"-ChatHistory").empty();

        Buddies[b].IsSelected = (Buddies[b].identity == buddy);
    }

    // Change to Stream if in Narrow view
    UpdateUI();
    
    // Refresh Stream
    // console.log("Refreshing Stream for you(" + profileUserID + ") and : " + buddyObj.identity);
    RefreshStream(buddyObj);

    try{
        $("#contact-" + buddy).get(0).scrollIntoViewIfNeeded();
    } catch(e){}

    // Save Selected
    localDB.setItem("SelectedBuddy", buddy);
}
function CloseBuddy(buddy){
    // Lines and Buddies (Left)
    $(".buddySelected").each(function () {
        $(this).prop('class', 'buddy');
    });
    // Streams (Right)
    $(".streamSelected").each(function () {
        $(this).prop('class', 'stream');
    });

    console.log("Closing Buddy: "+ buddy);
    for(var b = 0; b < Buddies.length; b++){
        Buddies[b].IsSelected = false;
    }
    selectedBuddy = null;
    for(var l = 0; l < Lines.length; l++){
        Lines[l].IsSelected = false;
    }
    selectedLine = null;

    // Save Selected
    localDB.setItem("SelectedBuddy", null);

    // Change to Stream if in Narrow view
    UpdateUI();
}
function RemoveBuddy(buddy){
    // Check if you are on the phone etc

    CloseWindow();

    Confirm(lang.confirm_remove_buddy, lang.remove_buddy, function(){
        DoRemoveBuddy(buddy)
        UpdateBuddyList();
    });
}
function DoRemoveBuddy(buddy){
    for(var b = 0; b < Buddies.length; b++) {
        if(Buddies[b].identity == buddy) {
            RemoveBuddyMessageStream(Buddies[b]);
            UnsubscribeBuddy(Buddies[b]);
            if(Buddies[b].type == "xmpp") XmppRemoveBuddyFromRoster(Buddies[b]);
            Buddies.splice(b, 1);
            break;
        }
    }
}
function FindBuddyByDid(did){
    // Used only in Inbound
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].ExtNo == did || Buddies[b].MobileNumber == did || Buddies[b].ContactNumber1 == did || Buddies[b].ContactNumber2 == did) {
            return Buddies[b];
        }
    }
    return null;
}
function FindBuddyByExtNo(ExtNo){
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].ExtNo == ExtNo) return Buddies[b];
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
function FindBuddyByJid(jid){
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].jid == jid) return Buddies[b];
    }
    console.warn("Buddy not found on jid: "+ jid);
    return null;
}
function FindBuddyByObservedUser(SubscribeUser){
    for(var b = 0; b < Buddies.length; b++){
        if(Buddies[b].SubscribeUser == SubscribeUser) return Buddies[b];
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
        console.log("Rows without filter ("+ filter +"): ", json.DataCollection.length);
        json.DataCollection = json.DataCollection.filter(function(item){
            if(filter.indexOf("date: ") != -1){
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
        console.log("Rows:", json.DataCollection.length, " (will be trimmed to "+ StreamBuffer +")");
        // Always limit the Stream to {StreamBuffer}, users much search for messages further back
        json.DataCollection.splice(StreamBuffer);
    }

    $.each(json.DataCollection, function (i, item) {

        var IsToday = moment.utc(item.ItemDate.replace(" UTC", "")).isSame(moment.utc(), "day");
        var DateTime = moment.utc(item.ItemDate.replace(" UTC", "")).local().calendar(null, { sameElse: DisplayDateFormat });
        if(IsToday) DateTime = moment.utc(item.ItemDate.replace(" UTC", "")).local().format(DisplayTimeFormat);

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
            if(item.Delivered && item.Delivered.state == true) {
                deliveryStatus += " <i class=\"fa fa-check DeliveredMessage\"></i>";
            }
            if(item.Displayed && item.Displayed.state == true){
                deliveryStatus = "<i class=\"fa fa-check CompletedMessage\"></i>";
            }

            var formattedMessage = ReformatMessage(item.MessageData);
            var longMessage = (formattedMessage.length > 1000);

            if (item.SrcUserId == profileUserID) {
                // You are the source (sending)
                var messageString = "<table class=ourChatMessage cellspacing=0 cellpadding=0><tr>"
                messageString += "<td class=ourChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">"
                messageString += "<span onclick=\"ShowMessageMenu(this,'MSG','"+  item.ItemId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
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
                messageString += "<span onclick=\"ShowMessageMenu(this,'MSG','"+  item.ItemId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
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

                // Update any received messages
                if(buddyObj.type == "xmpp") {
                    var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
                    if (streamVisible && !item.Read) {
                        console.log("Buddy stream is now visible, marking XMPP message("+ item.ItemId +") as read")
                        MarkMessageRead(buddyObj, item.ItemId);
                        XmppSendDisplayReceipt(buddyObj, item.ItemId);
                    }
                }

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
                                recordingsHtml += "<div><button class=roundButtons onclick=\"PlayVideoCallRecording(this, '"+ item.CdrId +"', '"+ recording.uID +"', '"+ buddyObj.identity +"')\"><i class=\"fa fa-video-camera\"></i></button></div>";
                            }
                        } 
                        else {
                            recordingsHtml += "<div><button class=roundButtons onclick=\"PlayAudioCallRecording(this, '"+ item.CdrId +"', '"+ recording.uID +"', '"+ buddyObj.identity +"')\"><i class=\"fa fa-play\"></i></button></div>";
                        } 
                        recordingsHtml += "<div>"+ lang.started +": "+ StartTime.format(DisplayTimeFormat) +" <i class=\"fa fa-long-arrow-right\"></i> "+ lang.stopped +": "+ StopTime.format(DisplayTimeFormat) +"</div>";
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
                messageString += "<span onClick=\"ShowMessageMenu(this,'CDR','"+  item.CdrId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
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
                    formattedMessage += " "+ lang.you_received + " "+ audioVideo +", "+ lang.and_spoke_for +" " + formatDuration(item.Billsec) + ".";
                }
                var messageString = "<table class=theirChatMessage cellspacing=0 cellpadding=0><tr>";
                messageString += "<td class=theirChatMessageText onmouseenter=\"ShowChatMenu(this)\" onmouseleave=\"HideChatMenu(this)\">";
                messageString += "<span onClick=\"ShowMessageMenu(this,'CDR','"+  item.CdrId +"', '"+ buddyObj.identity +"')\" class=chatMessageDropdown style=\"display:none\"><i class=\"fa fa-chevron-down\"></i></span>";
                messageString += "<div style=\"text-align:left\">" + formattedMessage + "</div>";
                messageString += "<div>" + CallTags + "</div>";
                messageString += "<div id=cdr-comment-"+  item.CdrId +" class=cdrComment>" + callComment + "</div>";
                messageString += "<div class=callRecordings>" + recordingsHtml + "</div>";
                messageString += "<div class=messageDate> " + DateTime + "</div>";
                messageString += "</td>";
                messageString += "<td style=\"padding-left:4px\">" + flag + "</td>";
                messageString += "</tr></table>";
            }
            // Messages are prepended here, and appended when logging
            $("#contact-" + buddyObj.identity + "-ChatHistory").prepend(messageString);
        } 
        else if(item.ItemType == "FILE"){
            // TODO
        } 
        else if(item.ItemType == "SMS"){
            // TODO
        }
    });

    // For some reason, the first time this fires, it doesn't always work
    updateScroll(buddyObj.identity);
    window.setTimeout(function(){
        updateScroll(buddyObj.identity);
    }, 300);
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

// Video Conference Stage
// ======================
function RedrawStage(lineNum, videoChanged){
    var  stage = $("#line-" + lineNum + "-VideoCall");
    var container = $("#line-" + lineNum + "-stage-container");
    var previewContainer = $("#line-"+  lineNum +"-preview-container");
    var videoContainer = $("#line-" + lineNum + "-remote-videos");

    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;
    var session = lineObj.SipSession;
    if(session == null) return;

    var isVideoPinned = false;
    var pinnedVideoID = "";

    // Preview Area
    previewContainer.find('video').each(function(i, video) {
        $(video).hide();
    });
    previewContainer.css("width",  "");

    // Count and Tag Videos
    var videoCount = 0;
    videoContainer.find('video').each(function(i, video) {
        var thisRemoteVideoStream = video.srcObject;
        var videoTrack = thisRemoteVideoStream.getVideoTracks()[0];
        var videoTrackSettings = videoTrack.getSettings();
        var srcVideoWidth = (videoTrackSettings.width)? videoTrackSettings.width : video.videoWidth;
        var srcVideoHeight = (videoTrackSettings.height)? videoTrackSettings.height : video.videoHeight;

        if(thisRemoteVideoStream.mid) {
            thisRemoteVideoStream.channel = "unknown"; // Asterisk Channel
            thisRemoteVideoStream.CallerIdName = "";
            thisRemoteVideoStream.CallerIdNumber = "";
            thisRemoteVideoStream.isAdminMuted = false;
            thisRemoteVideoStream.isAdministrator = false;
            if(session && session.data && session.data.videoChannelNames){
                session.data.videoChannelNames.forEach(function(videoChannelName){
                    if(thisRemoteVideoStream.mid == videoChannelName.mid){
                        thisRemoteVideoStream.channel = videoChannelName.channel;
                    }
                });
            }
            if(session && session.data && session.data.ConfbridgeChannels){
                session.data.ConfbridgeChannels.forEach(function(ConfbridgeChannel){
                    if(ConfbridgeChannel.id == thisRemoteVideoStream.channel){
                        thisRemoteVideoStream.CallerIdName = ConfbridgeChannel.caller.name;
                        thisRemoteVideoStream.CallerIdNumber = ConfbridgeChannel.caller.number;
                        thisRemoteVideoStream.isAdminMuted = ConfbridgeChannel.muted;
                        thisRemoteVideoStream.isAdministrator = ConfbridgeChannel.admin;
                    }
                });
            }
            // console.log("Track MID :", thisRemoteVideoStream.mid, thisRemoteVideoStream.channel);
        }

        // Remove any in the preview area
        if(videoChanged){
            $("#line-" + lineNum + "-preview-container").find('video').each(function(i, video) {
                if(video.id.indexOf("copy-") == 0){
                    video.remove();
                }
            });
        }

        // Prep Videos
        $(video).parent().off("click");
        $(video).parent().css("width", "1px");
        $(video).parent().css("height", "1px");
        $(video).hide();
        $(video).parent().hide();

        // Count Videos
        if(lineObj.pinnedVideo && lineObj.pinnedVideo == thisRemoteVideoStream.trackID && videoTrack.readyState == "live" && srcVideoWidth > 10 && srcVideoHeight >= 10){
            // A valid and live video is pinned
            isVideoPinned = true;
            pinnedVideoID = lineObj.pinnedVideo;
        }
        // Count All the videos
        if(videoTrack.readyState == "live" && srcVideoWidth > 10 && srcVideoHeight >= 10) {
            videoCount ++;
            console.log("Display Video - ", videoTrack.readyState, "MID:", thisRemoteVideoStream.mid, "channel:", thisRemoteVideoStream.channel, "src width:", srcVideoWidth, "src height", srcVideoHeight);
        }
        else{
            console.log("Hide Video - ", videoTrack.readyState ,"MID:", thisRemoteVideoStream.mid);
        }


    });
    if(videoCount == 0) {
        // If you are the only one in the conference, just display your self
        previewContainer.css("width",  previewWidth +"px");
        previewContainer.find('video').each(function(i, video) {
            $(video).show();
        });
        return;
    }
    if(isVideoPinned) videoCount = 1;

    if(!videoContainer.outerWidth() > 0) return;
    if(!videoContainer.outerHeight() > 0) return;

    // videoAspectRatio (1|1.33|1.77) is for the peer video, so can technically be used here
    // default ia 4:3
    var Margin = 3;
    var videoRatio = 0.750; // 0.5625 = 9/16 (16:9) | 0.75   = 3/4 (4:3)
    if(videoAspectRatio == "" || videoAspectRatio == "1.33") videoRatio = 0.750;  
    if(videoAspectRatio == "1.77") videoRatio = 0.5625;
    if(videoAspectRatio == "1") videoRatio = 1;
    var stageWidth = videoContainer.outerWidth() - (Margin * 2);
    var stageHeight = videoContainer.outerHeight() - (Margin * 2);
    var previewWidth = previewContainer.outerWidth();
    var maxWidth = 0;
    let i = 1;
    while (i < 5000) {
        let w = StageArea(i, videoCount, stageWidth, stageHeight, Margin, videoRatio);
        if (w === false) {
            maxWidth =  i - 1;
            break;
        }
        i++;
    }
    maxWidth = maxWidth - (Margin * 2);

    // Layout Videos
    videoContainer.find('video').each(function(i, video) {
        var thisRemoteVideoStream = video.srcObject;
        var videoTrack = thisRemoteVideoStream.getVideoTracks()[0];
        var videoTrackSettings = videoTrack.getSettings();
        var srcVideoWidth = (videoTrackSettings.width)? videoTrackSettings.width : video.videoWidth;
        var srcVideoHeight = (videoTrackSettings.height)? videoTrackSettings.height : video.videoHeight;

        var videoWidth = maxWidth;
        var videoHeight = maxWidth * videoRatio;

        // Set & Show
        if(isVideoPinned){
            // One of the videos are pinned
            if(pinnedVideoID == video.srcObject.trackID){
                $(video).parent().css("width", videoWidth+"px");
                $(video).parent().css("height", videoHeight+"px");
                $(video).show();
                $(video).parent().show();
                // Pinned Actions
                var unPinButton = $("<button />", {
                    class: "videoOverlayButtons",
                });
                unPinButton.html("<i class=\"fa fa-th-large\"></i>");
                unPinButton.on("click", function(){
                    UnPinVideo(lineNum, video);
                });
                $(video).parent().find(".Actions").empty();
                $(video).parent().find(".Actions").append(unPinButton);
            } else {
                // Put the videos in the preview area
                if(videoTrack.readyState == "live" && srcVideoWidth > 10 && srcVideoHeight >= 10) {
                    if(videoChanged){
                        var videoEl = $("<video />", {
                            id: "copy-"+ thisRemoteVideoStream.id,
                            muted: true,
                            autoplay: true,
                            playsinline: true,
                            controls: false
                        });
                        var videoObj = videoEl.get(0);
                        videoObj.srcObject = thisRemoteVideoStream;
                        $("#line-" + lineNum + "-preview-container").append(videoEl);
                    }
                }
            }
        }
        else {
            // None of the videos are pinned
            if(videoTrack.readyState == "live" && srcVideoWidth > 10 && srcVideoHeight >= 10) {
                // Unpinned 
                $(video).parent().css("width", videoWidth+"px");
                $(video).parent().css("height", videoHeight+"px");
                $(video).show();
                $(video).parent().show();
                // Unpinned Actions
                var pinButton = $("<button />", {
                    class: "videoOverlayButtons",
                });
                pinButton.html("<i class=\"fa fa-thumb-tack\"></i>");
                pinButton.on("click", function(){
                    PinVideo(lineNum, video, video.srcObject.trackID);
                });
                $(video).parent().find(".Actions").empty();
                if(videoCount > 1){
                    // More then one video, nothing pinned
                    $(video).parent().find(".Actions").append(pinButton);
                }

            }
        }

        // Populate Caller ID
        var adminMuteIndicator = "";
        var administratorIndicator = "";
        if(thisRemoteVideoStream.isAdminMuted == true){
            adminMuteIndicator = "<i class=\"fa fa-microphone-slash\" style=\"color:red\"></i>&nbsp;"
        }
        if(thisRemoteVideoStream.isAdministrator == true){
            administratorIndicator = "<i class=\"fa fa-user\" style=\"color:orange\"></i>&nbsp;"
        }
        if(thisRemoteVideoStream.CallerIdName == ""){
            thisRemoteVideoStream.CallerIdName = FindBuddyByIdentity(session.data.buddyId).CallerIDName;
        }
        $(video).parent().find(".callerID").html(administratorIndicator + adminMuteIndicator + thisRemoteVideoStream.CallerIdName);


    });

    // Preview Area
    previewContainer.css("width",  previewWidth +"px");
    previewContainer.find('video').each(function(i, video) {
        $(video).show();
    });

}
function StageArea(Increment, Count, Width, Height, Margin, videoRatio) {
    // Thanks:  https://github.com/Alicunde/Videoconference-Dish-CSS-JS
    let i = w = 0;
    let h = Increment * videoRatio + (Margin * 2);
    while (i < (Count)) {
        if ((w + Increment) > Width) {
            w = 0;
            h = h + (Increment * videoRatio) + (Margin * 2);
        }
        w = w + Increment + (Margin * 2);
        i++;
    }
    if (h > Height) return false;
    else return Increment;
}
function PinVideo(lineNum, videoEl, trackID){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;

    console.log("Setting Pinned Video:", trackID);
    lineObj.pinnedVideo = trackID;
    videoEl.srcObject.isPinned = true;
    RedrawStage(lineNum, true);
}
function UnPinVideo(lineNum, videoEl){
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null) return;

    console.log("Removing Pinned Video");
    lineObj.pinnedVideo = "";
    videoEl.srcObject.isPinned = false;
    RedrawStage(lineNum, true);
}


// Stream Functionality
// =====================
function ShowMessageMenu(obj, typeStr, cdrId, buddy) {

    var items = [];
    if (typeStr == "CDR") {
        var TagState = $("#cdr-flagged-"+ cdrId).is(":visible");
        var TagText = (TagState)? lang.clear_flag : lang.flag_call;

        items.push({ value: 1, icon: "fa fa-external-link", text: lang.show_call_detail_record });
        items.push({ value: 2, icon: "fa fa-tags", text: lang.tag_call });
        items.push({ value: 3, icon: "fa fa-flag", text: TagText });
        items.push({ value: 4, icon: "fa fa-quote-left", text: lang.edit_comment });
        // items.push({ value: 20, icon: null, text: "Delete CDR" });
        // items.push({ value: 21, icon: null, text: "Remove Poster Images" });
    }
    else if (typeStr == "MSG") {
        items.push({ value: 10, icon: "fa fa-clipboard", text: lang.copy_message });
        // items.push({ value: 11, icon: "fa fa-pencil", text: "Edit Message" });
        items.push({ value: 12, icon: "fa fa-quote-left", text: lang.quote_message });
    }

    var menu = {
        selectEvent : function( event, ui ) {
            var id = ui.item.attr("value");
            HidePopup();

            if(id != null) {
                console.log("Menu click ("+ id +")");

                // CDR messages
                if(id == 1){

                    var cdr = null;
                    var currentStream = JSON.parse(localDB.getItem(buddy + "-stream"));
                    if(currentStream != null || currentStream.DataCollection != null){
                        $.each(currentStream.DataCollection, function (i, item) {
                            if (item.ItemType == "CDR" && item.CdrId == cdrId) {
                                // Found
                                cdr = item;
                                return false;
                            }
                        });
                    }
                    if(cdr == null) return;

                    var callDetails = [];
                    var html = "<div class=\"UiWindowField\">";

                    // Billsec: 2.461
                    // CallAnswer: "2020-06-22 09:47:52 UTC" | null
                    // CallDirection: "outbound"
                    // CallEnd: "2020-06-22 09:47:54 UTC"
                    // CdrId: "15928192748351E9D"
                    // ConfCalls: [{…}]
                    // Dst: "*65"
                    // DstUserId: "15919450411467CC"
                    // Holds: [{…}]
                    // ItemDate: "2020-06-22 09:47:50 UTC"
                    // ItemType: "CDR"
                    // MessageData: null
                    // Mutes: [{…}]
                    // QOS: [{…}]
                    // ReasonCode: 16
                    // ReasonText: "Normal Call clearing"
                    // Recordings: [{…}]
                    // RingTime: 2.374
                    // SessionId: "67sv8o86msa7df23"
                    // Src: "<100> Conrad de Wet"
                    // SrcUserId: "17186D5983F"
                    // Tags: [{…}]
                    // Terminate: "us"
                    // TotalDuration: 4.835
                    // Transfers: [{…}]
                    // WithVideo: false

                    var CallDate = moment.utc(cdr.ItemDate.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat);
                    var CallAnswer = (cdr.CallAnswer)? moment.utc(cdr.CallAnswer.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat) : null ;
                    var ringTime = (cdr.RingTime)? cdr.RingTime : 0 ;
                    var CallEnd = moment.utc(cdr.CallEnd.replace(" UTC", "")).local().format(DisplayDateFormat +" "+ DisplayTimeFormat);

                    var srcCallerID = "";
                    var dstCallerID = "";
                    if(cdr.CallDirection == "inbound") {
                        srcCallerID = cdr.Src;
                    } 
                    else if(cdr.CallDirection == "outbound") {
                        dstCallerID = cdr.Dst;
                    }
                    html += "<div class=UiText><b>SIP CallID</b> : "+ cdr.SessionId +"</div>";
                    html += "<div class=UiText><b>"+ lang.call_direction +"</b> : "+ cdr.CallDirection +"</div>";
                    html += "<div class=UiText><b>"+ lang.call_date_and_time +"</b> : "+ CallDate +"</div>";
                    html += "<div class=UiText><b>"+ lang.ring_time +"</b> : "+ formatDuration(ringTime) +" ("+ ringTime +")</div>";
                    html += "<div class=UiText><b>"+ lang.talk_time +"</b> : " + formatDuration(cdr.Billsec) +" ("+ cdr.Billsec +")</div>";
                    html += "<div class=UiText><b>"+ lang.call_duration +"</b> : "+ formatDuration(cdr.TotalDuration) +" ("+ cdr.TotalDuration +")</div>";
                    html += "<div class=UiText><b>"+ lang.video_call +"</b> : "+ ((cdr.WithVideo)? lang.yes : lang.no) +"</div>";
                    html += "<div class=UiText><b>"+ lang.flagged +"</b> : "+ ((cdr.Flagged)? "<i class=\"fa fa-flag FlagCall\"></i> " + lang.yes : lang.no)  +"</div>";
                    html += "<hr>";
                    html += "<h2 style=\"font-size: 16px\">"+ lang.call_tags +"</h2>";
                    html += "<hr>";
                    $.each(cdr.Tags, function(item, tag){
                        html += "<span class=cdrTag>"+ tag.value +"</span>"
                    });

                    html += "<h2 style=\"font-size: 16px\">"+ lang.call_notes +"</h2>";
                    html += "<hr>";
                    if(cdr.MessageData){
                        html += "\"" + cdr.MessageData + "\"";
                    }

                    html += "<h2 style=\"font-size: 16px\">"+ lang.activity_timeline +"</h2>";
                    html += "<hr>";

                    var withVideo = (cdr.WithVideo)? "("+ lang.with_video +")" : "";
                    var startCallMessage = (cdr.CallDirection == "inbound")? lang.you_received_a_call_from + " " + srcCallerID  +" "+ withVideo : lang.you_made_a_call_to + " " + dstCallerID +" "+ withVideo;
                    callDetails.push({ 
                        Message: startCallMessage,
                        TimeStr: cdr.ItemDate
                    });
                    if(CallAnswer){
                        var answerCallMessage = (cdr.CallDirection == "inbound")? lang.you_answered_after + " " + ringTime + " " + lang.seconds_plural : lang.they_answered_after + " " + ringTime + " " + lang.seconds_plural;
                        callDetails.push({ 
                            Message: answerCallMessage,
                            TimeStr: cdr.CallAnswer
                        });
                    }
                    $.each(cdr.Transfers, function(item, transfer){
                        var msg = (transfer.type == "Blind")? lang.you_started_a_blind_transfer_to +" "+ transfer.to +". " : lang.you_started_an_attended_transfer_to + " "+ transfer.to +". ";
                        if(transfer.accept && transfer.accept.complete == true){
                            msg += lang.the_call_was_completed
                        }
                        else if(transfer.accept.disposition != "") {
                            msg += lang.the_call_was_not_completed +" ("+ transfer.accept.disposition +")"
                        }
                        callDetails.push({
                            Message : msg,
                            TimeStr : transfer.transferTime
                        });
                    });
                    $.each(cdr.Mutes, function(item, mute){
                        callDetails.push({
                            Message : (mute.event == "mute")? lang.you_put_the_call_on_mute : lang.you_took_the_call_off_mute,
                            TimeStr : mute.eventTime
                        });
                    });
                    $.each(cdr.Holds, function(item, hold){
                        callDetails.push({
                            Message : (hold.event == "hold")? lang.you_put_the_call_on_hold : lang.you_took_the_call_off_hold,
                            TimeStr : hold.eventTime
                        });
                    });
                    $.each(cdr.ConfbridgeEvents, function(item, event){
                        callDetails.push({
                            Message : event.event,
                            TimeStr : event.eventTime
                        });
                    });
                    $.each(cdr.ConfCalls, function(item, confCall){
                        var msg = lang.you_started_a_conference_call_to +" "+ confCall.to +". ";
                        if(confCall.accept && confCall.accept.complete == true){
                            msg += lang.the_call_was_completed
                        }
                        else if(confCall.accept.disposition != "") {
                            msg += lang.the_call_was_not_completed +" ("+ confCall.accept.disposition +")"
                        }
                        callDetails.push({
                            Message : msg,
                            TimeStr : confCall.startTime
                        });
                    });
                    $.each(cdr.Recordings, function(item, recording){
                        var StartTime = moment.utc(recording.startTime.replace(" UTC", "")).local();
                        var StopTime = moment.utc(recording.stopTime.replace(" UTC", "")).local();
                        var recordingDuration = moment.duration(StopTime.diff(StartTime));

                        var msg = lang.call_is_being_recorded;
                        if(recording.startTime != recording.stopTime){
                            msg += "("+ formatShortDuration(recordingDuration.asSeconds()) +")"
                        }
                        callDetails.push({
                            Message : msg,
                            TimeStr : recording.startTime
                        });
                    });
                    callDetails.push({
                        Message: (cdr.Terminate == "us")? lang.you_ended_the_call : lang.they_ended_the_call,
                        TimeStr : cdr.CallEnd
                    });

                    callDetails.sort(function(a, b){
                        var aMo = moment.utc(a.TimeStr.replace(" UTC", ""));
                        var bMo = moment.utc(b.TimeStr.replace(" UTC", ""));
                        if (aMo.isSameOrAfter(bMo, "second")) {
                            return 1;
                        } else return -1;
                        return 0;
                    });
                    $.each(callDetails, function(item, detail){
                        var Time = moment.utc(detail.TimeStr.replace(" UTC", "")).local().format(DisplayTimeFormat);
                        var messageString = "<table class=timelineMessage cellspacing=0 cellpadding=0><tr>"
                        messageString += "<td class=timelineMessageArea>"
                        messageString += "<div class=timelineMessageDate style=\"color: #333333\"><i class=\"fa fa-circle timelineMessageDot\"></i>"+ Time +"</div>"
                        messageString += "<div class=timelineMessageText style=\"color: #000000\">"+ detail.Message +"</div>"
                        messageString += "</td>"
                        messageString += "</tr></table>";
                        html += messageString;
                    });

                    html += "<h2 style=\"font-size: 16px\">"+ lang.call_recordings +"</h2>";
                    html += "<hr>";
                    var recordingsHtml = "";
                    $.each(cdr.Recordings, function(r, recording){
                        if(recording.uID){
                            var StartTime = moment.utc(recording.startTime.replace(" UTC", "")).local();
                            var StopTime = moment.utc(recording.stopTime.replace(" UTC", "")).local();
                            var recordingDuration = moment.duration(StopTime.diff(StartTime));
                            recordingsHtml += "<div>";
                            if(cdr.WithVideo){
                                recordingsHtml += "<div><video id=\"callrecording-video-"+ recording.uID +"\" controls playsinline style=\"width: 100%\"></div>";
                            } 
                            else {
                                recordingsHtml += "<div><audio id=\"callrecording-audio-"+ recording.uID +"\" controls style=\"width: 100%\"></div>";
                            } 
                            recordingsHtml += "<div>"+ lang.started +": "+ StartTime.format(DisplayTimeFormat) +" <i class=\"fa fa-long-arrow-right\"></i> "+ lang.stopped +": "+ StopTime.format(DisplayTimeFormat) +"</div>";
                            recordingsHtml += "<div>"+ lang.recording_duration +": "+ formatShortDuration(recordingDuration.asSeconds()) +"</div>";
                            recordingsHtml += "<div><a id=\"download-"+ recording.uID +"\">"+ lang.save_as +"</a> ("+ lang.right_click_and_select_save_link_as +")</div>";
                            recordingsHtml += "</div>";
                        }
                    });
                    html += recordingsHtml;
                    if(cdr.CallAnswer) {
                        html += "<h2 style=\"font-size: 16px\">"+ lang.send_statistics +"</h2>";
                        html += "<hr>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioSendBitRate\"></canvas></div>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioSendPacketRate\"></canvas></div>";
            
                        html += "<h2 style=\"font-size: 16px\">"+ lang.receive_statistics +"</h2>";
                        html += "<hr>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioReceiveBitRate\"></canvas></div>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioReceivePacketRate\"></canvas></div>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioReceivePacketLoss\"></canvas></div>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioReceiveJitter\"></canvas></div>";
                        html += "<div style=\"position: relative; margin: auto; height: 160px; width: 100%;\"><canvas id=\"cdr-AudioReceiveLevels\"></canvas></div>";
                    }

                    html += "<br><br></div>";
                    OpenWindow(html, lang.call_detail_record, 480, 640, false, true, null, null, lang.cancel, function(){
                        CloseWindow();
                    }, function(){
                        // Queue video and audio
                        $.each(cdr.Recordings, function(r, recording){
                            var mediaObj = null;
                            if(cdr.WithVideo){
                                mediaObj = $("#callrecording-video-"+ recording.uID).get(0);
                            }
                            else {
                                mediaObj = $("#callrecording-audio-"+ recording.uID).get(0);
                            }
                            var downloadURL = $("#download-"+ recording.uID);

                            // Playback device
                            var sinkId = getAudioOutputID();
                            if (typeof mediaObj.sinkId !== 'undefined') {
                                mediaObj.setSinkId(sinkId).then(function(){
                                    console.log("sinkId applied: "+ sinkId);
                                }).catch(function(e){
                                    console.warn("Error using setSinkId: ", e);
                                });
                            } else {
                                console.warn("setSinkId() is not possible using this browser.")
                            }

                            // Get Call Recording
                            if(CallRecordingsIndexDb != null){
                                var transaction = CallRecordingsIndexDb.transaction(["Recordings"]);
                                var objectStoreGet = transaction.objectStore("Recordings").get(recording.uID);
                                objectStoreGet.onerror = function(event) {
                                    console.error("IndexDB Get Error:", event);
                                }
                                objectStoreGet.onsuccess = function(event) {
                                    var mediaBlobUrl = window.URL.createObjectURL(event.target.result.mediaBlob);
                                    mediaObj.src = mediaBlobUrl;

                                    // Download Link
                                    if(cdr.WithVideo){
                                        downloadURL.prop("download",  "Video-Call-Recording-"+ recording.uID +".webm");
                                    }
                                    else {
                                        downloadURL.prop("download",  "Audio-Call-Recording-"+ recording.uID +".webm");
                                    }
                                    downloadURL.prop("href", mediaBlobUrl);
                                }
                            }
                            else {
                                console.warn("CallRecordingsIndexDb is null.");
                            }
                        });

                        // Display QOS data
                        if(cdr.CallAnswer) DisplayQosData(cdr.SessionId);
                    });
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
                        console.log("Text copied to the clipboard:", msgtext);
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
                }

                // Delete CDR
                // TODO: This doesn't look for the cdr or the QOS, don't use this
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
                                console.log("Poster Image Deleted");
                                return false;
                            }
                        });
                        localDB.setItem(buddy + "-stream", JSON.stringify(currentStream));
                        RefreshStream(FindBuddyByIdentity(buddy));
                    }
                }

            }
        },
        createEvent : null,
        autoFocus : true,
        items : items
    }
    PopupMenu(obj, menu);
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
    console.log("Removing Tag:", $(obj).text());
    $(obj).remove();

    // Update DB
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
    if(UiCustomMessageAction){
        if(typeof web_hook_on_message_action !== 'undefined') {
            web_hook_on_message_action(buddy, obj);
        }
        return;
    }

    var items = [];
    if(EnableTextExpressions) items.push({ value: 1, icon : "fa fa-smile-o", text: lang.select_expression });
    if(EnableTextDictate) items.push({ value: 2, icon : "fa fa-microphone", text: lang.dictate_message });
    // TODO
    if(EnableSendFiles) menu.push({ value: 3, name: "<i class=\"fa fa-share-alt\"></i> Share File" });
    if(EnableSendImages) menu.push({ value: 4, name: "<i class=\"fa fa-camera\"></i> Take/Share Picture" });
    if(EnableAudioRecording) menu.push({ value: 5, name: "<i class=\"fa fa-file-audio-o\"></i> Record Audio Message" });
    if(EnableVideoRecording) menu.push({ value: 6, name: "<i class=\"fa fa-file-video-o\"></i> Record Video Message" });
    // items.push();
    // items.push();
    // items.push();
    // items.push();
    // items.push();

    var menu = {
        selectEvent : function( event, ui ) {
            var id = ui.item.attr("value");
            HidePopup();
            if(id != null) {
                // Emoji Bar
                if(id == "1"){
                    ShowEmojiBar(buddy);
                }
                // Dictate Message
                if(id == "2"){
                    ShowDictate(buddy);
                }
                // 
            }
        },
        createEvent : null,
        autoFocus : true,
        items : items
    }
    PopupMenu(obj, menu);
}
function ShowEmojiBar(buddy){
    var messageContainer = $("#contact-"+ buddy +"-emoji-menu");
    var textarea = $("#contact-"+ buddy +"-ChatMessage");

    var menuBar = $("<div/>");
    menuBar.prop("class", "emojiButton")
    var emojis = ["😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🙁","🙂","🙃","🙄","🤐","🤑","🤒","🤓","🤔","🤕","🤠","🤡","🤢","🤣","🤤","🤥","🤧","🤨","🤩","🤪","🤫","🤬","🤭","🤮","🤯","🧐"];
    $.each(emojis, function(i,e){
        var emoji = $("<button>");
        emoji.html(e);
        emoji.on('click', function(){
            var i = textarea.prop('selectionStart');
            var v = textarea.val();
            textarea.val(v.substring(0, i) + $(this).html() + v.substring(i, v.length));
            messageContainer.hide();

            updateScroll(buddy);
        });
        menuBar.append(emoji);
    });

    messageContainer.empty();
    messageContainer.append(menuBar);
    messageContainer.show();

    updateScroll(buddy);
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
        // Limitation: This object can only be made once on the page
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

    var instructions = $("<div/>");
    var messageContainer = $("#contact-"+ buddy +"-dictate-message");
    var textarea = $("#contact-"+ buddy +"-ChatMessage");

    buddyObj.recognition.continuous = true;
    buddyObj.recognition.onstart = function() { 
        instructions.html("<i class=\"fa fa-microphone\" style=\"font-size: 21px\"></i><i class=\"fa fa-cog fa-spin\" style=\"font-size:10px; vertical-align:text-bottom; margin-left:2px\"></i> "+ lang.im_listening);
        updateScroll(buddy);
    }
    buddyObj.recognition.onspeechend = function() {
        instructions.html(lang.msg_silence_detection);
        window.setTimeout(function(){
            messageContainer.hide();
            updateScroll(buddy);
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
            updateScroll(buddy);
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
        }
    }

    messageContainer.empty();
    messageContainer.append(instructions);
    messageContainer.show();

    updateScroll(buddy);

    buddyObj.recognition.start();
}

// My Profile
// ==========
function ShowMyProfile(){
    CloseUpSettings();

    $("#myContacts").hide();
    $("#searchArea").hide();
    $("#actionArea").empty();

    var html = "<div style=\"text-align:right\"><button class=roundButtons onclick=\"ShowContacts()\"><i class=\"fa fa-close\"></i></button></div>"

    html += "<div border=0 class=UiSideField>";

    // SIP Account
    if(EnableAccountSettings == true){
        html += "<div class=UiTextHeading onclick=\"ToggleHeading(this,'Configure_Extension_Html')\"><i class=\"fa fa-user-circle-o UiTextHeadingIcon\" style=\"background-color:#a93a3a\"></i> "+ lang.account +"</div>"
    }
    var AccountHtml =  "<div id=Configure_Extension_Html style=\"display:none\">";
    AccountHtml += "<div class=UiText>"+ lang.asterisk_server_address +":</div>";
    AccountHtml += "<div><input id=Configure_Account_wssServer class=UiInputText type=text placeholder='"+ lang.eg_asterisk_server_address +"' value='"+ getDbItem("wssServer", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.websocket_port +":</div>";
    AccountHtml += "<div><input id=Configure_Account_WebSocketPort class=UiInputText type=text placeholder='"+ lang.eg_websocket_port +"' value='"+ getDbItem("WebSocketPort", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.websocket_path +":</div>";
    AccountHtml += "<div><input id=Configure_Account_ServerPath class=UiInputText type=text placeholder='"+ lang.eg_websocket_path +"' value='"+ getDbItem("ServerPath", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.full_name +":</div>";
    AccountHtml += "<div><input id=Configure_Account_profileName class=UiInputText type=text placeholder='"+ lang.eg_full_name +"' value='"+ getDbItem("profileName", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.sip_domain +":</div>";
    AccountHtml += "<div><input id=Configure_Account_SipDomain class=UiInputText type=text placeholder='"+ lang.eg_sip_domain +"' value='"+ getDbItem("SipDomain", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.sip_username +":</div>";
    AccountHtml += "<div><input id=Configure_Account_SipUsername class=UiInputText type=text placeholder='"+ lang.eg_sip_username +"' value='"+ getDbItem("SipUsername", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.sip_password +":</div>";
    AccountHtml += "<div><input id=Configure_Account_SipPassword class=UiInputText type=password placeholder='"+ lang.eg_sip_password +"' value='"+ getDbItem("SipPassword", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.subscribe_voicemail +":</div>";
    AccountHtml += "<div><input type=checkbox id=Configure_Account_Voicemail_Subscribe "+ ((VoiceMailSubscribe == true)? "checked" : "") +"><label for=Configure_Account_Voicemail_Subscribe>"+ lang.yes +"</label></div>";

    AccountHtml += "<div id=Voicemail_Did_row style=\"display:"+ ((VoiceMailSubscribe == true)? "unset" : "none") +"\">";
    AccountHtml += "<div class=UiText style=\"margin-left:20px\">"+ lang.voicemail_did +":</div>";
    AccountHtml += "<div style=\"margin-left:20px\"><input id=Configure_Account_Voicemail_Did class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"' value='"+ getDbItem("VoicemailDid", "") +"'></div>";
    AccountHtml += "</div>";

    AccountHtml += "<div class=UiText>"+ lang.chat_engine +":</div>";

    AccountHtml += "<ul style=\"list-style-type:none\">"
    AccountHtml += "<li><input type=radio name=chatEngine id=chat_type_sip "+ ((ChatEngine == "XMPP")? "" : "checked") +"><label for=chat_type_sip>SIP</label>"
    AccountHtml += "<li><input type=radio name=chatEngine id=chat_type_xmpp "+ ((ChatEngine == "XMPP")? "checked" : "") +"><label for=chat_type_xmpp>XMPP</label>"
    AccountHtml += "</ul>"

    AccountHtml += "<div id=RowChatEngine_xmpp style=\"display:"+ ((ChatEngine == "XMPP")? "unset" : "none") +"\">";

    AccountHtml += "<div class=UiText>"+ lang.xmpp_server_address +":</div>";
    AccountHtml += "<div><input id=Configure_Account_xmpp_address class=UiInputText type=text placeholder='"+ lang.eg_xmpp_server_address +"' value='"+ getDbItem("XmppServer", "") +"'></div>";

    AccountHtml += "<div class=UiText>XMPP "+ lang.websocket_port +":</div>";
    AccountHtml += "<div><input id=Configure_Account_xmpp_port class=UiInputText type=text placeholder='"+ lang.eg_websocket_port +"' value='"+ getDbItem("XmppWebsocketPort", "") +"'></div>";

    AccountHtml += "<div class=UiText>XMPP "+ lang.websocket_path +":</div>";
    AccountHtml += "<div><input id=Configure_Account_xmpp_path class=UiInputText type=text placeholder='"+ lang.eg_websocket_path +"' value='"+ getDbItem("XmppWebsocketPath", "") +"'></div>";

    AccountHtml += "<div class=UiText>XMPP "+ lang.sip_domain +":</div>";
    AccountHtml += "<div><input id=Configure_Account_xmpp_domain class=UiInputText type=text placeholder='"+ lang.eg_sip_domain +"' value='"+ getDbItem("XmppDomain", "") +"'></div>";

    AccountHtml += "<div class=UiText>"+ lang.extension_number +":</div>";
    AccountHtml += "<div><input id=Configure_Account_profileUser class=UiInputText type=text placeholder='"+ lang.eg_internal_subscribe_extension +"' value='"+ getDbItem("profileUser", "") +"'></div>";
    AccountHtml += "</div>";

    AccountHtml += "</div>";
    if(EnableAccountSettings == true) html += AccountHtml;

    // 2 Audio & Video
    html += "<div class=UiTextHeading onclick=\"ToggleHeading(this,'Audio_Video_Html')\"><i class=\"fa fa fa-video-camera UiTextHeadingIcon\" style=\"background-color:#208e3c\"></i> "+ lang.audio_video +"</div>"

    var AudioVideoHtml = "<div id=Audio_Video_Html style=\"display:none\">";

    AudioVideoHtml += "<div class=UiText>"+ lang.speaker +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=playbackSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_SpeakerOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><button class=roundButtons id=preview_output_play><i class=\"fa fa-play\"></i></button></div>";

    AudioVideoHtml += "<div id=RingDeviceSection>";
    AudioVideoHtml += "<div class=UiText>"+ lang.ring_device +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=ringDevice style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_RingerOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><button class=roundButtons id=preview_ringer_play><i class=\"fa fa-play\"></i></button></div>";
    AudioVideoHtml += "</div>";

    AudioVideoHtml += "<div class=UiText>"+ lang.microphone +":</div>";
    AudioVideoHtml += "<div style=\"text-align:center\"><select id=microphoneSrc style=\"width:100%\"></select></div>";
    AudioVideoHtml += "<div class=Settings_VolumeOutput_Container><div id=Settings_MicrophoneOutput class=Settings_VolumeOutput></div></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_AutoGainControl><label for=Settings_AutoGainControl> "+ lang.auto_gain_control +"<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_EchoCancellation><label for=Settings_EchoCancellation> "+ lang.echo_cancellation +"<label></div>";
    AudioVideoHtml += "<div><input type=checkbox id=Settings_NoiseSuppression><label for=Settings_NoiseSuppression> "+ lang.noise_suppression +"<label></div>";

    if(EnableVideoCalling == true){
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
        AudioVideoHtml += "<input name=Settings_Orientation id=r20 type=radio value=\"rotateY(0deg)\"><label class=radio_pill for=r20><i class=\"fa fa-address-card\" style=\"transform: rotateY(0deg)\"></i> "+ lang.image_orientation_normal +"</label>";
        AudioVideoHtml += "<input name=Settings_Orientation id=r21 type=radio value=\"rotateY(180deg)\"><label class=radio_pill for=r21><i class=\"fa fa-address-card\" style=\"transform: rotateY(180deg)\"></i> "+ lang.image_orientation_mirror +"</label>";
        AudioVideoHtml += "</div>";

        AudioVideoHtml += "<div class=UiText>"+ lang.aspect_ratio +":</div>";
        AudioVideoHtml += "<div class=pill-nav>";
        AudioVideoHtml += "<input name=Settings_AspectRatio id=r10 type=radio value=\"1\"><label class=radio_pill for=r10><i class=\"fa fa-square-o\" style=\"transform: scaleX(1); margin-left: 7px; margin-right: 7px\"></i> 1:1</label>";
        AudioVideoHtml += "<input name=Settings_AspectRatio id=r11 type=radio value=\"1.33\"><label class=radio_pill for=r11><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.33); margin-left: 5px; margin-right: 5px;\"></i> 4:3</label>";
        AudioVideoHtml += "<input name=Settings_AspectRatio id=r12 type=radio value=\"1.77\"><label class=radio_pill for=r12><i class=\"fa fa-square-o\" style=\"transform: scaleX(1.77); margin-right: 3px;\"></i> 16:9</label>";
        AudioVideoHtml += "<input name=Settings_AspectRatio id=r13 type=radio value=\"\"><label class=radio_pill for=r13><i class=\"fa fa-trash\"></i></label>";
        AudioVideoHtml += "</div>";

        AudioVideoHtml += "<div class=UiText>"+ lang.preview +":</div>";
        AudioVideoHtml += "<div style=\"text-align:center; margin-top:10px\"><video id=local-video-preview class=previewVideo muted playsinline></video></div>";
    }

    AudioVideoHtml += "</div>";

    html += AudioVideoHtml;

    // 3 Appearance
    if(EnableAppearanceSettings == true) {
        html += "<div class=UiTextHeading onclick=\"ToggleHeading(this,'Appearance_Html')\"><i class=\"fa fa-pencil UiTextHeadingIcon\" style=\"background-color:#416493\"></i> "+ lang.appearance +"</div>"
    }

    var AppearanceHtml = "<div id=Appearance_Html style=\"display:none\">"; 
    AppearanceHtml += "<div id=ImageCanvas style=\"width:150px; height:150px\"></div>";
    AppearanceHtml += "<div style=\"margin-top:50px;\"><input id=fileUploader type=file></div>";
    AppearanceHtml += "<div style=\"margin-top:10px\"></div>";

    // SIP & XMPP vCard
    var profileVcard = getDbItem("profileVcard", null);
    if(profileVcard != null) profileVcard = JSON.parse(profileVcard);

    AppearanceHtml += "<div class=UiText>"+ lang.title_description +":</div>";
    AppearanceHtml += "<div><input id=Configure_Profile_TitleDesc class=UiInputText type=text placeholder='"+ lang.eg_general_manager +"' value='"+ ((profileVcard != null)? profileVcard.TitleDesc : "") +"'></div>";
    AppearanceHtml += "<div class=UiText>"+ lang.mobile_number +":</div>";
    AppearanceHtml += "<div><input id=Configure_Profile_Mobile class=UiInputText type=text placeholder='"+ lang.eg_mobile_number +"' value='"+ ((profileVcard != null)? profileVcard.Mobile : "") +"'></div>";
    AppearanceHtml += "<div class=UiText>"+ lang.email +":</div>";
    AppearanceHtml += "<div><input id=Configure_Profile_Email class=UiInputText type=text placeholder='"+ lang.email +"' value='"+ ((profileVcard != null)? profileVcard.Email : "") +"'></div>";
    AppearanceHtml += "<div class=UiText>"+ lang.contact_number_1 +":</div>";
    AppearanceHtml += "<div><input id=Configure_Profile_Number1 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_1 +"' value='"+ ((profileVcard != null)? profileVcard.Number1 : "") +"'></div>";
    AppearanceHtml += "<div class=UiText>"+ lang.contact_number_2 +":</div>";
    AppearanceHtml += "<div><input id=Configure_Profile_Number2 class=UiInputText type=text placeholder='"+ lang.eg_contact_number_2 +"' value='"+ ((profileVcard != null)? profileVcard.Number2 : "") +"'></div>";

    AppearanceHtml += "</div>";

    if(EnableAppearanceSettings == true) html += AppearanceHtml;

    // 4 Notifications
    if(EnableNotificationSettings == true) {
        html += "<div class=UiTextHeading onclick=\"ToggleHeading(this,'Notifications_Html')\"><i class=\"fa fa-bell UiTextHeadingIcon\" style=\"background-color:#ab8e04\"></i> "+ lang.notifications +"</div>"
    }

    var NotificationsHtml = "<div id=Notifications_Html style=\"display:none\">";
    NotificationsHtml += "<div class=UiText>"+ lang.notifications +":</div>";
    NotificationsHtml += "<div><input type=checkbox id=Settings_Notifications><label for=Settings_Notifications> "+ lang.enable_onscreen_notifications +"<label></div>";
    NotificationsHtml += "</div>";
    // TODO: Add ring tone selection etc

    if(EnableNotificationSettings == true) html += NotificationsHtml;

    html += "</div>";

    html += "<div class=UiWindowButtonBar id=ButtonBar></div>";

    $("#actionArea").html(html);

    // Buttons
    var buttons = [];
    buttons.push({
        text: lang.save,
        action: function(){

            var chatEng = ($("#chat_type_sip").is(':checked'))? "SIMPLE" : "XMPP";

            if(EnableAccountSettings){
                if($("#Configure_Account_wssServer").val() == "") {
                    console.warn("Validation Failed");
                    return;
                } 
                if($("#Configure_Account_WebSocketPort").val() == "") {
                    console.warn("Validation Failed");
                    return;
                } 
                if($("#Configure_Account_profileName").val() == "") {
                    console.warn("Validation Failed");
                    return;
                } 
                if($("#Configure_Account_SipDomain").val() == "") {
                    console.warn("Validation Failed");
                    return;
                }
                if($("#Configure_Account_SipUsername").val() == "") {
                    console.warn("Validation Failed");
                    return;
                } 
                if($("#Configure_Account_SipPassword").val() == "") {
                    console.warn("Validation Failed");
                    return;
                }
                if(chatEng == "XMPP"){
                    if($("#Configure_Account_xmpp_address").val() == "") {
                        console.warn("Validation Failed");
                        return;
                    } 
                    if($("#Configure_Account_xmpp_port").val() == "") {
                        console.warn("Validation Failed");
                        return;
                    }
                    if($("#Configure_Account_xmpp_domain").val() == "") {
                        console.warn("Validation Failed");
                        return;
                    }
                    if($("#Configure_Account_profileUser").val() == "") {
                        console.warn("Validation Failed");
                        return;
                    }
                }
            }

            // The profileUserID identifies users
            if(localDB.getItem("profileUserID") == null) localDB.setItem("profileUserID", uID()); // For first time only
    
            // 1 Account
            if(EnableAccountSettings){
                localDB.setItem("wssServer", $("#Configure_Account_wssServer").val());
                localDB.setItem("WebSocketPort", $("#Configure_Account_WebSocketPort").val());
                localDB.setItem("ServerPath", $("#Configure_Account_ServerPath").val());
                localDB.setItem("profileName", $("#Configure_Account_profileName").val());
                localDB.setItem("SipDomain", $("#Configure_Account_SipDomain").val());
                localDB.setItem("SipUsername", $("#Configure_Account_SipUsername").val());
                localDB.setItem("SipPassword", $("#Configure_Account_SipPassword").val());
                localDB.setItem("VoiceMailSubscribe", ($("#Configure_Account_Voicemail_Subscribe").is(':checked'))? "1" : "0");
                localDB.setItem("VoicemailDid", $("#Configure_Account_Voicemail_Did").val());

                localDB.setItem("ChatEngine", chatEng);

                localDB.setItem("XmppServer", $("#Configure_Account_xmpp_address").val());
                localDB.setItem("XmppWebsocketPort", $("#Configure_Account_xmpp_port").val());
                localDB.setItem("XmppWebsocketPath", $("#Configure_Account_xmpp_path").val());
                localDB.setItem("XmppDomain", $("#Configure_Account_xmpp_domain").val());
                localDB.setItem("profileUser", $("#Configure_Account_profileUser").val());
            }
    
            // 2 Audio & Video
            localDB.setItem("AudioOutputId", $("#playbackSrc").val());
            localDB.setItem("AudioSrcId", $("#microphoneSrc").val());
            localDB.setItem("AutoGainControl", ($("#Settings_AutoGainControl").is(':checked'))? "1" : "0");
            localDB.setItem("EchoCancellation", ($("#Settings_EchoCancellation").is(':checked'))? "1" : "0");
            localDB.setItem("NoiseSuppression", ($("#Settings_NoiseSuppression").is(':checked'))? "1" : "0");
            localDB.setItem("RingOutputId", $("#ringDevice").val());

            if(EnableVideoCalling == true){
                localDB.setItem("VideoSrcId", $("#previewVideoSrc").val());
                localDB.setItem("VideoHeight", $("input[name=Settings_Quality]:checked").val());
                localDB.setItem("FrameRate", $("input[name=Settings_FrameRate]:checked").val());
                localDB.setItem("AspectRatio", $("input[name=Settings_AspectRatio]:checked").val());
                localDB.setItem("VideoOrientation", $("input[name=Settings_Orientation]:checked").val());
            }
            // 3 Appearance
            if(EnableAppearanceSettings){
                var vCard = { 
                    "TitleDesc": $("#Configure_Profile_TitleDesc").val(),
                    "Mobile": $("#Configure_Profile_Mobile").val(),
                    "Email": $("#Configure_Profile_Email").val(),
                    "Number1": $("#Configure_Profile_Number1").val(),
                    "Number2": $("#Configure_Profile_Number2").val(),
                }
                localDB.setItem("profileVcard", JSON.stringify(vCard));

                var options =  { 
                    type: 'base64', 
                    size: 'viewport', 
                    format: 'webp', // png
                    quality: 0.5, 
                    circle: false 
                }
                $("#Appearance_Html").show(); // Bug, only works if visible
                $("#ImageCanvas").croppie('result', options).then(function(base64) {
                    localDB.setItem("profilePicture", base64);
                    $("#Appearance_Html").hide();

                    // Notify Changes
                    Alert(lang.alert_settings, lang.reload_required, function(){
                        window.location.reload();
                    });
        
                });
            }
            else {
                // Notify Changes
                Alert(lang.alert_settings, lang.reload_required, function(){
                    window.location.reload();
                });
            }

            // 4 Notifications
            if(EnableNotificationSettings){
                localDB.setItem("Notifications", ($("#Settings_Notifications").is(":checked"))? "1" : "0");
            }

        }
    });
    buttons.push({
        text: lang.cancel,
        action: function(){
            ShowContacts();
        }
    });
    $.each(buttons, function(i,obj){
        var button = $('<button>'+ obj.text +'</button>').click(obj.action);
        $("#ButtonBar").append(button);
    });

    // Show
    $("#actionArea").show();

    // DoOnload
    window.setTimeout(function(){
        // Account
        if(EnableAccountSettings){
            $("#chat_type_sip").change(function(){
                if($("#chat_type_sip").is(':checked')){
                    $("#RowChatEngine_xmpp").hide();
                }
            });
            $("#chat_type_xmpp").change(function(){
                if($("#chat_type_xmpp").is(':checked')){
                    $("#RowChatEngine_xmpp").show();
                }
            });
            $("#Configure_Account_Voicemail_Subscribe").change(function(){
                if($("#Configure_Account_Voicemail_Subscribe").is(':checked')){
                    $("#Voicemail_Did_row").show();
                } else {
                    $("#Voicemail_Did_row").hide();
                }
            });
        }

        // Audio Preview
        var playButton = $("#preview_output_play");
        // Audio Preview Button press
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
            console.log("Audio:", audioBlobs.speech_orig.url);
            var audioObj = new Audio(audioBlobs.speech_orig.blob);
            audioObj.preload = "auto";
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

        var playRingButton = $("#preview_ringer_play");
        // Ringtone Button Press
        playRingButton.click(function(){
    
            try{
                window.SettingsRingerAudio.pause();
            } 
            catch(e){}
            window.SettingsRingerAudio = null;
    
            try{
                var tracks = window.SettingsRingerStream.getTracks();
                tracks.forEach(function(track) {
                    track.stop();
                });
            }
            catch(e){}
            window.SettingsRingerStream = null;
    
            try{
                var soundMeter = window.SettingsRingerStreamMeter;
                soundMeter.stop();
            }
            catch(e){}
            window.SettingsRingerStreamMeter = null;
    
            // Load Sample
            console.log("Audio:", audioBlobs.Ringtone.url);
            var audioObj = new Audio(audioBlobs.Ringtone.blob);
            audioObj.preload = "auto";
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
                window.SettingsRingerStream = outputStream;
                window.SettingsRingerStreamMeter = MeterSettingsOutput(outputStream, "Settings_RingerOutput", "width", 50);
            }
            audioObj.oncanplaythrough = function(e) {
                if (typeof audioObj.sinkId !== 'undefined') {
                    audioObj.setSinkId(selectRingDevice.val()).then(function() {
                        console.log("Set sinkId to:", selectRingDevice.val());
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
    
            window.SettingsRingerAudio = audioObj;
        });

        // Audio Playback Source
        var selectAudioScr = $("#playbackSrc");
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

        // Microphone
        var selectMicScr = $("#microphoneSrc");
        $("#Settings_AutoGainControl").prop("checked", AutoGainControl);
        $("#Settings_EchoCancellation").prop("checked", EchoCancellation);
        $("#Settings_NoiseSuppression").prop("checked", NoiseSuppression);
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

        // Ring Tone
        var selectRingTone = $("#ringTone");
        // TODO
    
        // Ring Device
        var selectRingDevice = $("#ringDevice");

        if(EnableVideoCalling == true){

            // Webcam
            var selectVideoScr = $("#previewVideoSrc");
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

            // Orientation
            var OriteationSel = $("input[name=Settings_Orientation]");
            OriteationSel.each(function(){
                if(this.value == MirrorVideo) $(this).prop("checked", true);
            });
            $("#local-video-preview").css("transform", MirrorVideo);
            // Change Video Image
            OriteationSel.change(function(){
                console.log("Call to change Orientation ("+ this.value +")");
                $("#local-video-preview").css("transform", this.value);
            });
        
            // Frame Rate
            var frameRateSel = $("input[name=Settings_FrameRate]");
            frameRateSel.each(function(){
                if(this.value == maxFrameRate) $(this).prop("checked", true);
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
        
            // Quality
            var QualitySel = $("input[name=Settings_Quality]");
            QualitySel.each(function(){
                if(this.value == videoHeight) $(this).prop("checked", true);
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
        
            // Aspect Ratio
            var AspectRatioSel = $("input[name=Settings_AspectRatio]");
            AspectRatioSel.each(function(){
                if(this.value == videoAspectRatio) $(this).prop("checked", true);
            });    
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
        
            // Note: Only works over HTTPS or via localhost!!
            var localVideo = $("#local-video-preview").get(0);
            localVideo.muted = true;
            localVideo.playsinline = true;
            localVideo.autoplay = true;
        }

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
                        if(EnableVideoCalling == true){
                            VideoFound = true;
                            if(savedVideoDevice != "default" && deviceInfos[i].deviceId == savedVideoDevice) {
                                videoDeviceFound = true;
                            }
                        }
                    }
                }
    
                var contraints = {
                    audio: MicrophoneFound,
                    video: VideoFound
                }
    
                if(MicrophoneFound){
                    contraints.audio = { deviceId: "default" }
                    if(audioDeviceFound) contraints.audio.deviceId = { exact: savedAudioDevice }
                }

                if(EnableVideoCalling == true){
                    if(VideoFound){
                        contraints.video = { deviceId: "default" }
                        if(videoDeviceFound) contraints.video.deviceId = { exact: savedVideoDevice }
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
                }
                console.log("Get User Media", contraints);

                // Get User Media
                navigator.mediaDevices.getUserMedia(contraints).then(function(mediaStream){
                    // Note: This code may fire after the close button

                    // Handle Audio
                    settingsMicrophoneStreamTrack = (mediaStream.getAudioTracks().length >= 1)? mediaStream.getAudioTracks()[0] : null ;
                    if(MicrophoneFound && settingsMicrophoneStreamTrack != null){
                        settingsMicrophoneStream = new MediaStream();
                        settingsMicrophoneStream.addTrack(settingsMicrophoneStreamTrack);
                        // Display Micrphone Levels
                        // window.SettingsMicrophoneStream = settingsMicrophoneStream;
                        settingsMicrophoneSoundMeter = MeterSettingsOutput(settingsMicrophoneStream, "Settings_MicrophoneOutput", "width", 50);
                    }
                    else {
                        console.warn("No microphone devices found. Calling will not be possible.")
                    }

                    // Display Output Levels
                    $("#Settings_SpeakerOutput").css("width", "0%");
                    $("#Settings_RingerOutput").css("width", "0%");
                    if(!SpeakerFound){
                        console.log("No speaker devices found, make sure one is plugged in.")
                        $("#playbackSrc").hide();
                        $("#RingDeviceSection").hide();
                    }
    
                    if(EnableVideoCalling == true){
                        // Handle Video
                        settingsVideoStreamTrack = (mediaStream.getVideoTracks().length >= 1)? mediaStream.getVideoTracks()[0] : null;
                        if(VideoFound && settingsVideoStreamTrack != null){
                            settingsVideoStream = new MediaStream();
                            settingsVideoStream.addTrack(settingsVideoStreamTrack);
                            // Display Preview Video
                            localVideo.srcObject = settingsVideoStream;
                            localVideo.onloadedmetadata = function(e) {
                                localVideo.play();
                            }
                        }
                        else {
                            console.warn("No video / webcam devices found. Video Calling will not be possible.")
                        }
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
                            var ringOption = option.clone();
                            if(getRingerOutputID() == devideId) ringOption.prop("selected", true);
                            selectRingDevice.append(ringOption);
                        }
                        else if (deviceInfo.kind === "videoinput") {
                            if(EnableVideoCalling == true){
                                if(getVideoSrcID() == devideId) option.prop("selected", true);
                                option.text((DisplayName != "")? DisplayName : "Webcam");
                                selectVideoScr.append(option);
                            }
                        }
                    }
                    if(EnableVideoCalling == true){
                        // Add "Default" option
                        if(selectVideoScr.children('option').length > 0){
                            var option = $('<option/>');
                            option.prop("value", "default");
                            if(getVideoSrcID() == "default" || getVideoSrcID() == "" || getVideoSrcID() == "null") option.prop("selected", true);
                            option.text("("+ lang.default_video_src +")");
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

        // Appearance
        if(EnableAppearanceSettings){

            $("#Appearance_Html").show(); // Bit of an annoying bug... croppie has to be visible to work
            $("#ImageCanvas").croppie({
                viewport: { width: 150, height: 150, type: 'circle' }
            });

            // Preview Existing Image
            $("#ImageCanvas").croppie('bind', { 
                url: getPicture("profilePicture")
            }).then(function(){
                $("#Appearance_Html").hide();
            });
            

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
        }

        // Notifications
        if(EnableNotificationSettings){
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


    }, 0);
}
function RefreshRegistration(){
    Unregister();
    console.log("Unregister complete...");
    window.setTimeout(function(){
        console.log("Starting registration...");
        Register();
    }, 1000);
}
function ToggleHeading(obj, div){
    $("#"+ div).toggle();
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
    if(DoNotDisturbPolicy == "enabled") {
        DoNotDisturbEnabled = true;
        console.warn("Policy DoNotDisturb: Enabled");
        return;
    }
    if(DoNotDisturbEnabled == true){
        // Disable DND

        DoNotDisturbEnabled = false
        localDB.setItem("DoNotDisturbEnabled", "0");
        $("#dereglink").attr("class", "dotOnline");
        $("#dndStatus").html("");
        // Web Hook
        if(typeof web_hook_disable_dnd !== 'undefined') {
            web_hook_disable_dnd();
        }
    } else {
        // Enable DND

        DoNotDisturbEnabled = true
        localDB.setItem("DoNotDisturbEnabled", "1");
        $("#dereglink").attr("class", "dotDoNotDisturb");
        $("#dndStatus").html("(DND)");

        // Web Hook
        if(typeof web_hook_enable_dnd !== 'undefined') {
            web_hook_enable_dnd();
        }
    }
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

// Device and Settings
// ===================
function ChangeSettings(lineNum, obj){
    if(UiCustomMediaSettings){
        if(typeof web_hook_on_edit_media !== 'undefined') {
            web_hook_on_edit_media(lineNum, obj);
        }
        return;
    }

    // Check if you are in a call
    var lineObj = FindLineByNumber(lineNum);
    if(lineObj == null || lineObj.SipSession == null) {
        console.warn("SIP Session is NULL.");
        return;
    }
    var session = lineObj.SipSession;

    // Load Devices
    if(!navigator.mediaDevices) {
        console.warn("navigator.mediaDevices not possible.");
        return;
    }

    var items = [];

    // Microphones
    items.push({value: "", icon : null, text: lang.microphone, isHeader: true });
    for (var i = 0; i < AudioinputDevices.length; ++i) {
        var deviceInfo = AudioinputDevices[i];
        var devideId = deviceInfo.deviceId;
        var DisplayName = (deviceInfo.label)? deviceInfo.label : "Microphone";
        if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));
        var disabled = (session.data.AudioSourceDevice == devideId);

        items.push({value: "input-"+ devideId, icon : "fa fa-microphone", text: DisplayName, isDisabled : disabled });
    }
    // Speakers
    if(HasSpeakerDevice){
        items.push({value: "", icon : null, text: "-" });
        items.push({value: "", icon : null, text: lang.speaker, isHeader: true });
        for (var i = 0; i < SpeakerDevices.length; ++i) {
            var deviceInfo = SpeakerDevices[i];
            var devideId = deviceInfo.deviceId;
            var DisplayName = (deviceInfo.label)? deviceInfo.label : "Speaker";
            if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));
            var disabled = (session.data.AudioOutputDevice == devideId);

            items.push({value: "output-"+ devideId, icon : "fa fa-volume-up", text: DisplayName, isDisabled : disabled });
        }
    }
    // Cameras
    if(session.data.withvideo == true){
        items.push({value: "", icon : null, text: "-" });
        items.push({value: "", icon : null, text: lang.camera, isHeader: true });
        for (var i = 0; i < VideoinputDevices.length; ++i) {
            var deviceInfo = VideoinputDevices[i];
            var devideId = deviceInfo.deviceId;
            var DisplayName = (deviceInfo.label)? deviceInfo.label : "Webcam";
            if(DisplayName.indexOf("(") > 0) DisplayName = DisplayName.substring(0,DisplayName.indexOf("("));
            var disabled = (session.data.VideoSourceDevice == devideId);

            items.push({value: "video-"+ devideId, icon : "fa fa-video-camera", text: DisplayName, isDisabled : disabled });
        }
    }

    var menu = {
        selectEvent : function( event, ui ) {
            var id = ui.item.attr("value");
            if(id != null) {

                // Microphone Device Change
                if(id.indexOf("input-") > -1){
                    var newid = id.replace("input-", "");

                    console.log("Call to change Microphone: ", newid);

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
                    session.data.AudioSourceDevice = newid;
            
                    var constraints = {
                        audio: {
                            deviceId: (newid != "default")? { exact: newid } : "default"
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
                }

                // Speaker
                if(id.indexOf("output-") > -1){
                    var newid = id.replace("output-", "");

                    console.log("Call to change Speaker: ", newid);

                    HidePopup();
            
                    // Save Setting
                    session.data.AudioOutputDevice = newid;
            
                    // Also change the sinkId
                    // ======================
                    var sinkId = newid;
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
                }

                // Camera
                if(id.indexOf("video-") > -1){
                    var newid = id.replace("video-", "");

                    console.log("Call to change WebCam");

                    HidePopup();

                    switchVideoSource(lineNum, newid);
                }
            }
            else {
                HidePopup();
            }
        },
        createEvent : null,
        autoFocus : true,
        items : items
    }
    PopupMenu(obj, menu);
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
    $("#line-"+ lineNum + "-remote-videos").show();
    RedrawStage(lineNum, true);
    // $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

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

    $("#line-"+ lineNum + "-localVideo").show();
    $("#line-"+ lineNum + "-remote-videos").show();
    // $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

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

    $("#line-"+ lineNum + "-localVideo").show();
    $("#line-"+ lineNum + "-remote-videos").hide();
    // $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-preview-container");

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
    $("#line-"+ lineNum + "-remote-videos").show();
    // $("#line-"+ lineNum + "-remoteVideo").appendTo("#line-"+ lineNum + "-stage-container");

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
                }
                placeholderImage.src = event.target.result;

                // $("#contact-" + buddy + "-msgPreviewhtml").html("<img src=\""+ event.target.result +"\" style=\"max-width:320px; max-height:240px\" />");
                // $("#contact-" + buddy + "-msgPreview").show();
            }
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
    } else{
        // Consult the chatstates
        var buddyObj = FindBuddyByIdentity(buddy);
        if(buddyObj != null && buddyObj.type == "xmpp") XmppStartComposing(buddyObj);
    }
}
function chatOnInput(event, obj, buddy) {
    var str = $.trim($(obj).val())
    if (str != "") {
        $("#contact-" + buddy + "-sendMessageButtons").show();
    }
    else {
        $("#contact-" + buddy + "-sendMessageButtons").hide();
    }
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
function getPicture(buddy, typestr, ignoreCache){
    var avatars = defaultAvatars.split(",");
    var rndInt = Math.floor(Math.random() * avatars.length);
    var defaultImg = hostingPrefix + "" + imagesDirectory + "" + avatars[rndInt].trim();
    if(buddy == "profilePicture"){
        // Special handling for profile image
        var dbImg = localDB.getItem("profilePicture");
        if(dbImg == null){
            return defaultImg;
        }
        else {
            return dbImg;
            // return URL.createObjectURL(base64toBlob(dbImg, 'image/png'));
        }
    }

    typestr = (typestr)? typestr : "extension";
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null){
        return defaultImg
    }
    if(ignoreCache != true && buddyObj.imageObjectURL != ""){
        // Use Cache
        return buddyObj.imageObjectURL;
    }
    var dbImg = localDB.getItem("img-"+ buddy +"-"+ typestr);
    if(dbImg == null){
        buddyObj.imageObjectURL = defaultImg
        return buddyObj.imageObjectURL
    }
    else {
        buddyObj.imageObjectURL = URL.createObjectURL(base64toBlob(dbImg, 'image/webp')); // image/png
        return buddyObj.imageObjectURL;
    }
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
        var imgData = canvas.toDataURL({ format: 'webp' });  //png
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
    updateScroll(buddy);
}
function TogglePinned(buddy){
    var buddyObj = FindBuddyByIdentity(buddy);
    if(buddyObj == null) return;

    if(buddyObj.Pinned){
        // Disable
        console.log("Disable Pinned for", buddy);
        buddyObj.Pinned = false;
    }
    else {
        // Enalbe
        console.log("Enable Pinned for", buddy);
        buddyObj.Pinned = true;
    }

    // Take Out
    var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
    if(json != null) {
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddy || item.cID == buddy || item.gID == buddy){
                item.Pinned = buddyObj.Pinned;
                return false;
            }
        });
        // Put Back
        localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
    }

    // Update View
    UpdateBuddyList();
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
        }
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
// jQuery UI
function OpenWindow(html, title, height, width, hideCloseButton, allowResize, button1_Text, button1_onClick, button2_Text, button2_onClick, DoOnLoad, OnClose) {
    console.log("Open Window: " + title);

    // Close any windows that may already be open
    if(windowObj != null){
        windowObj.dialog("close");
        windowObj = null;
    }

    // Create Window
    windowObj = $('<div></div>').html(html).dialog({
        autoOpen: false,
        title: title,
        modal: true,
        width: width,
        height: height,
        resizable: allowResize,
        classes: { "ui-dialog-content": "cleanScroller"},
        close: function(event, ui) {
            $(this).dialog("destroy");
            windowObj = null;
        }
    });
    var buttons = [];
    if(button1_Text && button1_onClick){
        buttons.push({
            text: button1_Text,
            click: function(){
                console.log("Button 1 ("+ button1_Text +") Clicked");
                button1_onClick();
            }
        });
    }
    if(button2_Text && button2_onClick){
        buttons.push({
            text: button2_Text,
            click: function(){
                console.log("Button 2 ("+ button2_Text +") Clicked");
                button2_onClick();
            }
        });
    }
    if(buttons.length >= 1) windowObj.dialog( "option", "buttons", buttons);

    if(OnClose) windowObj.on("dialogbeforeclose", function(event, ui) {
        return OnClose(this);
    });
    if(DoOnLoad) windowObj.on("dialogopen", function(event, ui) {
        DoOnLoad();
    });

    // Open the Window
    windowObj.dialog("open");

    if (hideCloseButton) windowObj.dialog({ dialogClass: 'no-close' });
    // Doubl Click to maximise
    $(".ui-dialog-titlebar").dblclick(function(){
        var windowWidth = $(window).outerWidth()
        var windowHeight = $(window).outerHeight();
        windowObj.parent().css('top', '0px'); // option
        windowObj.parent().css('left', '0px');
        windowObj.dialog("option", "height", windowHeight); // option
        windowObj.dialog("option", "width", windowWidth);
        UpdateUI();
    });

    // Call UpdateUI to perform all the nesesary UI updates.
    UpdateUI();
}
function CloseWindow(all) {
    console.log("Call to close any open window");

    if(windowObj != null){
        windowObj.dialog("close");
        windowObj = null;
    }
    if(all == true){
        if (confirmObj != null) {
            confirmObj.dialog("close");
            confirmObj = null;
        }
        if (promptObj != null) {
            promptObj.dialog("close");
            promptObj = null;
        }
        if (alertObj != null) {
            alertObj.dialog("close");
            alertObj = null;
        }
    }
}
function WindowProgressOn() {
    //
}
function WindowProgressOff() {
    //
}
function Alert(messageStr, TitleStr, onOk) {
    if (confirmObj != null) {
        confirmObj.dialog("close");
        confirmObj = null;
    }
    if (promptObj != null) {
        promptObj.dialog("close");
        promptObj = null;
    }
    if (alertObj != null) {
        console.error("Alert not null, while Alert called: " + TitleStr + ", saying:" + messageStr);
        return;
    }
    else {
        console.log("Alert called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=AllertMessageText>" + messageStr + "</div>";
    html += "</div>"

    alertObj = $('<div>').html(html).dialog({
        autoOpen: false,
        title: TitleStr,
        modal: true,
        width: 300,
        height: "auto",
        resizable: false,
        closeOnEscape : false,
        close: function(event, ui) {
            $(this).dialog("destroy");
            alertObj = null;
        }
    });

    var buttons = [];
    buttons.push({
        text: lang.ok,
        click: function(){
            console.log("Alert OK clicked");
            if (onOk) onOk();
            $(this).dialog("close");
            alertObj = null;
        }
    });
    alertObj.dialog( "option", "buttons", buttons);

    // Open the Window
    alertObj.dialog("open");

    alertObj.dialog({ dialogClass: 'no-close' });

     // Call UpdateUI to perform all the nesesary UI updates.
     UpdateUI();

}
function Confirm(messageStr, TitleStr, onOk, onCancel) {
    if (alertObj != null) {
        alertObj.dialog("close");
        alertObj = null;
    }
    if (promptObj != null) {
        promptObj.dialog("close");
        promptObj = null;
    }
    if (confirmObj != null) {
        console.error("Confirm not null, while Confrim called with Title: " + TitleStr + ", saying: " + messageStr);
        return;
    }
    else {
        console.log("Confirm called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=ConfrimMessageText>" + messageStr + "</div>";
    html += "</div>";

    confirmObj = $('<div>').html(html).dialog({
        autoOpen: false,
        title: TitleStr,
        modal: true,
        width: 300,
        height: "auto",
        resizable: false,
        closeOnEscape : false,
        close: function(event, ui) {
            $(this).dialog("destroy");
            confirmObj = null;
        }
    });

    var buttons = [];
    buttons.push({
        text: lang.ok,
        click: function(){
            console.log("Confrim OK clicked");
            if (onOk) onOk();
            $(this).dialog("close");
            confirmObj = null;
        }
    });
    buttons.push({
        text: lang.cancel,
        click: function(){
            console.log("Confirm Cancel clicked");
            if (onCancel) onCancel();
            $(this).dialog("close");
            confirmObj = null;
        }
    });

    confirmObj.dialog( "option", "buttons", buttons);

    // Open the Window
    confirmObj.dialog("open");

    confirmObj.dialog({ dialogClass: 'no-close' });

    // Call UpdateUI to perform all the nesesary UI updates.
    UpdateUI();
}
function Prompt(messageStr, TitleStr, FieldText, defaultValue, dataType, placeholderText, onOk, onCancel) {
    if (alertObj != null) {
        alertObj.dialog("close");
        alertObj = null;
    }
    if (confirmObj != null) {
        confirmObj.dialog("close");
        confirmObj = null;
    }
    if (promptObj != null) {
        console.error("Prompt not null, while Prompt called with Title: " + TitleStr + ", saying: " + messageStr);
        return;
    }
    else {
        console.log("Prompt called with Title: " + TitleStr + ", saying: " + messageStr);
    }

    var html = "<div class=NoSelect>";
    html += "<div class=UiText style=\"padding: 10px\" id=PromptMessageText>";
    html += messageStr;
    html += "<div style=\"margin-top:10px\">" + FieldText + " : </div>";
    html += "<div style=\"margin-top:5px\"><INPUT id=PromptValueField type=" + dataType + " value=\"" + defaultValue + "\" placeholder=\"" + placeholderText + "\" style=\"width:98%\"></div>"
    html += "</div>";
    html += "</div>";

    promptObj = $('<div>').html(html).dialog({
        autoOpen: false,
        title: TitleStr,
        modal: true,
        width: 300,
        height: "auto",
        resizable: false,
        closeOnEscape : false,
        close: function(event, ui) {
            $(this).dialog("destroy");
            promptObj = null;
        }
    });
    
    var buttons = [];
    buttons.push({
        text: lang.ok,
        click: function(){
            console.log("Prompt OK clicked, with value: " + $("#PromptValueField").val());
            if (onOk) onOk($("#PromptValueField").val());
            $(this).dialog("close");
            promptObj = null;
        }
    });
    buttons.push({
        text: lang.cancel,
        click: function(){
            console.log("Prompt Cancel clicked");
            if (onCancel) onCancel();
            $(this).dialog("close");
            promptObj = null;
        }
    });
    promptObj.dialog( "option", "buttons", buttons);

    // Open the Window
    promptObj.dialog("open");

    promptObj.dialog({ dialogClass: 'no-close' });

    // Call UpdateUI to perform all the nesesary UI updates.
    UpdateUI();
}
function PopupMenu(obj, menu){
    console.log("Show Popup Menu");

    // Close any menu that may already be open
    if(menuObj != null){
        menuObj.menu("destroy");
        menuObj.empty();
        menuObj.remove();
        menuObj = null;
    }

    var x = $(obj).offset().left - $(document).scrollLeft();
    var y = $(obj).offset().top - $(document).scrollTop();
    var w = $(obj).outerWidth()
    var h = $(obj).outerHeight()

    menuObj = $("<ul></ul>");
    if(menu && menu.items){
        $.each(menu.items, function(i, item){
            var header = (item.isHeader == true)? " class=\"ui-widget-header\"" : "";
            var disabled = (item.isDisabled == true)? " class=\"ui-state-disabled\"" : "";
            if(item.icon != null){
                menuObj.append("<li value=\""+ item.value +"\" "+ header +" "+ disabled +"><div><span class=\""+ item.icon +" ui-icon\"></span>"+ item.text +"</div></li>");
            }
            else {
                menuObj.append("<li value=\""+ item.value +"\" "+ header +" "+ disabled +"><div>"+ item.text +"</div></li>");
            }
        });
    }
    menuObj.append("<li><div>-</div></li>");
    menuObj.append("<li><div style=\"text-align:center; padding-right: 2em\">"+ lang.cancel +"</div></li>");

    // Attach UL to body
    menuObj.appendTo(document.body);

    // Create Menu
    menuObj.menu({});

    // Event wireup
    if(menu && menu.selectEvent){
        menuObj.on("menuselect", menu.selectEvent);
    }
    if(menu && menu.createEvent){
        menuObj.on("menucreate", menu.createEvent);
    }
    menuObj.on('blur',function(){
        HidePopup();
    });
    if(menu && menu.autoFocus == true) menuObj.focus();

    // Final Positions
    var menuWidth = menuObj.outerWidth()
    var left = x-((menuWidth/2)-(w/2));
    if(left + menuWidth + 10 > window.innerWidth){
        left = window.innerWidth - menuWidth - 10;
    }
    if(left < 0) left = 0;
    menuObj.css("left",  left + "px");

    var menuHeight = menuObj.outerHeight()
    var top = y+h;
    if(top + menuHeight + 10 > window.innerHeight){
        top = window.innerHeight - menuHeight - 10;
    }
    if(top < 0) top = 0;
    menuObj.css("top", top + "px");

}

function HidePopup(timeout){
    if(timeout){
        window.setTimeout(function(){
            if(menuObj != null){
                menuObj.menu("destroy");
                try{
                    menuObj.empty();
                }
                catch(e){}
                try{
                    menuObj.remove();
                }
                catch(e){}
                menuObj = null;
            }
        }, timeout);
    } else {
        if(menuObj != null){
            menuObj.menu("destroy");
            try{
                menuObj.empty();
            }
            catch(e){}
            try{
                menuObj.remove();
            }
            catch(e){}
            menuObj = null;
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
                if(EnableVideoCalling == true){
                    HasVideoDevice = true;
                    VideoinputDevices.push(deviceInfos[i]);
                }
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

// =================================================================================

function onStatusChange(status) {
    // Strophe.ConnectionStatus = status;
    if (status == Strophe.Status.CONNECTING) {
        console.log('XMPP is connecting...');
    } 
    else if (status == Strophe.Status.CONNFAIL) {
        console.warn('XMPP failed to connect.');
    } 
    else if (status == Strophe.Status.DISCONNECTING) {
        console.log('XMPP is disconnecting.');
    } 
    else if (status == Strophe.Status.DISCONNECTED) {
        console.log('XMPP is disconnected.');
        
        // Keep connected
        window.setTimeout(function(){
            // reconnectXmpp();
        }, 5 * 1000);
    } 
    else if (status == Strophe.Status.CONNECTED) {
        console.log('XMPP is connected!');

        // Re-publish my vCard
        XmppSetMyVcard();

        // Get buddies
        XmppGetBuddies();

        XMPP.ping = window.setTimeout(function(){
            XmppSendPing();
        }, 45 * 1000);
    }
    else {
        console.log('XMPP is: ', Strophe.Status);
    }
}

function XmppSendPing(){
    // return;

    if(!XMPP || XMPP.connected == false) reconnectXmpp();

    var iq_request = $iq({"type":"get", "id":XMPP.getUniqueId(), "to":XmppDomain, "from":XMPP.jid});
    iq_request.c("ping", {"xmlns":"urn:xmpp:ping"});

    XMPP.sendIQ(iq_request, function (result){
        // console.log("XmppSendPing Response: ", result);
    }, function(e){
        console.warn("Error in Ping", e);
    }, 30 * 1000);

    XMPP.ping = window.setTimeout(function(){
        XmppSendPing();
    }, 45 * 1000);
    // TODO: Make this is a setting
}

// XMPP Presence
// =============
function XmppSetMyPresence(str, desc, updateVcard){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    // ["away", "chat", "dnd", "xa"] => ["Away", "Available", "Busy", "Gone"]

    console.log("Setting My Own Presence to: "+ str + "("+ desc +")");

    if(desc == "") desc = lang.default_status;
    $("#regStatus").html("<i class=\"fa fa-comments\"></i> "+ desc);

    var pres_request = $pres({"id": XMPP.getUniqueId(), "from": XMPP.jid });
    pres_request.c("show").t(str);
    if(desc && desc != ""){
        pres_request.root();
        pres_request.c("status").t(desc);
    }
    if(updateVcard == true){
        var base64 = getPicture("profilePicture");
        var imgBase64 = base64.split(",")[1];
        var photoHash = $.md5(imgBase64);

        pres_request.root();
        pres_request.c("x", {"xmlns": "vcard-temp:x:update"});
        if(photoHash){
            pres_request.c("photo", {}, photoHash);
        }
    }

    XMPP.sendPresence(pres_request, function (result){
        // console.log("XmppSetMyPresence Response: ", result);
    }, function(e){
        console.warn("Error in XmppSetMyPresence", e);
    }, 30 * 1000);
}
function onPresenceChange(presence) {
    // console.log('onPresenceChange', presence);

    var from = presence.getAttribute("from");
    var to = presence.getAttribute("to");

    var subscription = presence.getAttribute("subscription");
    var type = (presence.getAttribute("type"))? presence.getAttribute("type") : "presence"; // subscribe | subscribed | unavailable
    var pres = "";
    var status = "";
    var xmlns = "";
    Strophe.forEachChild(presence, "show", function(elem) {
        pres = elem.textContent;
    });
    Strophe.forEachChild(presence, "status", function(elem) {
        status = elem.textContent;
    });
    Strophe.forEachChild(presence, "x", function(elem) {
        xmlns = elem.getAttribute("xmlns");
    });

    var fromJid = Strophe.getBareJidFromJid(from);

    // Presence notification from me to me
    if(from == to){
        // Either my vCard updated, or my Presence updated
        return true;
    }

    // Find the buddy this message is coming from
    var buddyObj = FindBuddyByJid(fromJid);
    if(buddyObj == null) {

        // TODO: What to do here?

        console.warn("Buddy Not Found: ", fromJid);
        return true;
    }

    if(type == "subscribe"){
        // <presence xmlns="jabber:client" type="subscribe" from="58347g3721h~800@...com" id="1" subscription="both" to="58347g3721h~100@...com"/>
        // <presence xmlns="jabber:client" type="subscribe" from="58347g3721h~800@...com" id="1" subscription="both" to="58347g3721h~100@...com"/>
        
        // One of your buddies is requestion subscription
        console.log("Presence: "+ buddyObj.CallerIDName +" requesting subscrption");

        XmppConfirmSubscription(buddyObj);

        // Also Subscribe to them
        XmppSendSubscriptionRequest(buddyObj);

        UpdateBuddyList();
        return true;
    }
    if(type == "subscribed"){
        // One of your buddies has confimed subscription
        console.log("Presence: "+ buddyObj.CallerIDName +" confimed subscrption");

        UpdateBuddyList();
        return true;
    }
    if(type == "unavailable"){
        // <presence xmlns="jabber:client" type="unavailable" from="58347g3721h~800@...com/63zy33arw5" to="yas43lag8l@...com"/>
        console.log("Presence: "+ buddyObj.CallerIDName +" unavailable");

        UpdateBuddyList();
        return true;
    }

    if(xmlns == "vcard-temp:x:update"){
        // This is a presence update for the picture change
        console.log("Presence: "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +" vCard change");

        // Should check if the hash is different, could have been a non-picture change..
        // However, either way you would need to update the vCard, as there isnt a awy to just get the picture
        XmppGetBuddyVcard(buddyObj);
        
        UpdateBuddyList();
    }

    if(pres != "") {
        // This is a regulare 
        console.log("Presence: "+ buddyObj.ExtNo +" - "+ buddyObj.CallerIDName +" is now: "+ pres +"("+ status +")");

        buddyObj.presence = pres;
        buddyObj.presenceText = (status == "")? lang.default_status : status;

        UpdateBuddyList();
    }

    return true;
}
function XmppConfirmSubscription(buddyObj){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var pres_request = $pres({"to": buddyObj.jid, "from": XMPP.jid, "type": "subscribed"});
    XMPP.sendPresence(pres_request);
    // Responses are handled in the main handler
}
function XmppSendSubscriptionRequest(buddyObj){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var pres_request = $pres({"to": buddyObj.jid, "from":XMPP.jid, "type": "subscribe" });
    XMPP.sendPresence(pres_request);
    // Responses are handled in the main handler
}

// XMPP Roster
// ===========
function XmppRemoveBuddyFromRoster(buddyObj){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var iq_request = $iq({"type":"set", "id":XMPP.getUniqueId(), "from":XMPP.jid});
    iq_request.c("query", {"xmlns": "jabber:iq:roster"});
    iq_request.c("item", {"jid": buddyObj.jid, "subscription":"remove"});
    if(buddyObj.jid == null){
        console.warn("Missing JID", buddyObj);
        return;
    }
    console.log("Removing "+ buddyObj.CallerIDName +"  from roster...")

    XMPP.sendIQ(iq_request, function (result){
        // console.log(result);
    });
}
function XmppAddBuddyToRoster(buddyObj){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var iq_request = $iq({"type":"set", "id":XMPP.getUniqueId(), "from":XMPP.jid});
    iq_request.c("query", {"xmlns": "jabber:iq:roster"});
    iq_request.c("item", {"jid": buddyObj.jid, "name": buddyObj.CallerIDName});
    if(buddyObj.jid == null){
        console.warn("Missing JID", buddyObj);
        return;
    }
    console.log("Adding "+ buddyObj.CallerIDName +"  to roster...")

    XMPP.sendIQ(iq_request, function (result){
        // console.log(result);
        XmppGetBuddyVcard(buddyObj);

        XmppSendSubscriptionRequest(buddyObj);
    });
}

function XmppGetBuddies(){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var iq_request = $iq({"type":"get", "id":XMPP.getUniqueId(), "from":XMPP.jid});
    iq_request.c("query", {"xmlns":"jabber:iq:roster"});
    console.log("Getting Buddy List (roster)...")

    XMPP.sendIQ(iq_request, function (result){
        // console.log("XmppGetBuddies Response: ", result);

        // Clear out only XMPP

        Strophe.forEachChild(result, "query", function(query) {
            Strophe.forEachChild(query, "item", function(buddyItem) {

                // console.log("Register Buddy", buddyItem);

                // <item xmlns="jabber:iq:roster" jid="58347g3721h~800@xmpp-eu-west-1.innovateasterisk.com" name="Alfredo Dixon" subscription="both"/>
                // <item xmlns="jabber:iq:roster" jid="58347g3721h~123456@conference.xmpp-eu-west-1.innovateasterisk.com" name="Some Group Name" subscription="both"/>

                var jid = buddyItem.getAttribute("jid");
                var displayName = buddyItem.getAttribute("name");
                var node = Strophe.getNodeFromJid(jid);
                var buddyDid = node;
                if(XmppRealm != "" && XmppRealmSeparator !="") {
                    buddyDid = node.split(XmppRealmSeparator,2)[1];
                }
                var ask = (buddyItem.getAttribute("ask"))? buddyItem.getAttribute("ask") : "none";
                var sub = (buddyItem.getAttribute("subscription"))? buddyItem.getAttribute("subscription") : "none";
                var isGroup = (jid.indexOf("@"+ XmppChatGroupService +".") > -1);

                var buddyObj = FindBuddyByJid(jid);
                if(buddyObj == null){
                    // Create Cache
                    if(isGroup == true){
                        console.log("Adding roster (group):", buddyDid, "-", displayName);
                        buddyObj = MakeBuddy("group", false, false, false, displayName, buddyDid, jid, false, buddyDid, false, false);
                    }
                    else {
                        console.log("Adding roster (xmpp):", buddyDid, "-", displayName);
                        buddyObj = MakeBuddy("xmpp", false, false, true, displayName, buddyDid, jid, false, buddyDid, false, false);
                    }

                    // RefreshBuddyData(buddyObj);
                    XmppGetBuddyVcard(buddyObj);
                }
                else {
                    // Buddy cache exists
                    console.log("Existing roster item:", buddyDid, "-", displayName);

                    // RefreshBuddyData(buddyObj);
                    XmppGetBuddyVcard(buddyObj);
                }

            });
        });

        // Update your own status, and get the status of others
        XmppSetMyPresence(getDbItem("XmppLastPresence", "chat"), getDbItem("XmppLastStatus", ""), true);

        // Populate the buddy list
        UpdateBuddyList();

    }, function(e){
        console.warn("Error Getting Roster", e);
    }, 30 * 1000);
}
function onBuddySetRequest(iq){
    console.log('onBuddySetRequest', iq);

    // <iq xmlns="jabber:client" type="result" id="4e9dadc7-145b-4ea2-ae82-3220130231ba" to="yas43lag8l@xmpp-eu-west-1.innovateasterisk.com/4gte25lhkh">
    //     <query xmlns="jabber:iq:roster" ver="1386244571">
    //          <item jid="800@xmpp-eu-west-1.innovateasterisk.com" name="Alfredo Dixon" subscription="both"/>
    //     </query>
    // </iq>

    return true;
}
function onBuddyUpdate(iq){

    return true;
}
function RefreshBuddyData(buddyObj){

    // Get vCard
    
    return;

    // Get Last Activity
    var iq_request = $iq({"type":"get", "id":XMPP.getUniqueId(), "to":buddyObj.jid, "from":XMPP.jid});
    iq_request.c("query", {"xmlns":"jabber:iq:last"});
    XMPP.sendIQ(iq_request, function (result){
        console.log("jabber:iq:last Response: ", result);

        if(result.children[0].getAttribute("seconds")){
            var seconds = Number(result.children[0].getAttribute("seconds"));
            lastActivity = moment().utc().subtract(seconds, 'seconds').format("YYYY-MM-DD HH:mm:ss UTC");
    
            UpdateBuddyActivity(buddyObj.identity, lastActivity);
        }

    }, function(e){
        console.warn("Error in jabber:iq:last", e);
    }, 30 * 1000);

}

// Profile (vCard)
// ===============
function XmppGetMyVcard(){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var iq_request = $iq({"type" : "get", "id" : XMPP.getUniqueId(), "from" : XMPP.jid});
    iq_request.c("vCard", {"xmlns" : "vcard-temp"});

    XMPP.sendIQ(iq_request, function (result){
        console.log("XmppGetMyVcard Response: ", result);



    }, function(e){
        console.warn("Error in XmppGetMyVcard", e);
    }, 30 * 1000);
}
function XmppSetMyVcard(){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var profileVcard = getDbItem("profileVcard", null);
    if(profileVcard == null || profileVcard == ""){
        console.warn("No vCard created yet");
        return;
    }
    profileVcard = JSON.parse(profileVcard);

    var base64 = getPicture("profilePicture");
    var imgBase64 = base64.split(",")[1];

    var iq_request = $iq({"type" : "set", "id" : XMPP.getUniqueId(), "from" : XMPP.jid});
    iq_request.c("vCard", {"xmlns" : "vcard-temp"});
    iq_request.c("FN", {}, profileName);
    iq_request.c("TITLE", {}, profileVcard.TitleDesc);
    iq_request.c("TEL");
    iq_request.c("NUMBER", {}, profileUser);
    iq_request.up();
    iq_request.c("TEL");
    iq_request.c("CELL", {}, profileVcard.Mobile);
    iq_request.up();
    iq_request.c("TEL");
    iq_request.c("VOICE", {}, profileVcard.Number1);
    iq_request.up();
    iq_request.c("TEL");
    iq_request.c("FAX", {}, profileVcard.Number2);
    iq_request.up();
    iq_request.c("EMAIL");
    iq_request.c("USERID", {}, profileVcard.Email);
    iq_request.up();
    iq_request.c("PHOTO");
    iq_request.c("TYPE", {}, "image/webp"); // image/png
    iq_request.c("BINVAL", {}, imgBase64);
    iq_request.up();
    iq_request.c("JABBERID", {}, Strophe.getBareJidFromJid(XMPP.jid));

    console.log("Sending vCard update");
    XMPP.sendIQ(iq_request, function (result){
        // console.log("XmppSetMyVcard Response: ", result);
    }, function(e){
        console.warn("Error in XmppSetMyVcard", e);
    }, 30 * 1000);
}
function XmppGetBuddyVcard(buddyObj){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    if(buddyObj == null) return;
    if(buddyObj.jid == null) return;

    var iq_request = $iq({"type" : "get", "id" : XMPP.getUniqueId(), "from" : XMPP.jid, "to": buddyObj.jid});
    iq_request.c("vCard", {"xmlns" : "vcard-temp"});
    XMPP.sendIQ(iq_request, function (result){

        var jid = result.getAttribute("from");
        console.log("Got vCard for: "+ jid);

        var buddyObj = FindBuddyByJid(jid);
        if(buddyObj == null) {
            console.warn("Received a vCard for non-existing buddy", jid)
            return;
        }

        var imgBase64 = "";

        Strophe.forEachChild(result, "vCard", function(vcard) {
            Strophe.forEachChild(vcard, null, function(element) {
                if(element.tagName == "FN"){
                    buddyObj.CallerIDName = element.textContent;
                }
                if(element.tagName == "TITLE"){
                    buddyObj.Desc = element.textContent;
                }
                if(element.tagName == "JABBERID"){
                    if(element.textContent != jid){
                        console.warn("JID does not match: ", element.textContent, jid);
                    }
                }
                if(element.tagName == "TEL"){
                    Strophe.forEachChild(element, "NUMBER", function(ExtNo) {
                        // Voip Number (Subscribe)
                        if(ExtNo.textContent != buddyObj.ExtNo){
                            console.warn("Subscribe Extension does not match: ", ExtNo.textContent, buddyObj.ExtNo);
                        }
                    });
                    Strophe.forEachChild(element, "CELL", function(cell) {
                        // Mobile
                        buddyObj.MobileNumber = cell.textContent;
                    });
                    Strophe.forEachChild(element, "VOICE", function(Alt1) {
                        // Alt1
                        buddyObj.ContactNumber1 = Alt1.textContent;
                    });
                    Strophe.forEachChild(element, "FAX", function(Alt2) {
                        // Alt2
                        buddyObj.ContactNumber2 = Alt2.textContent;
                    });
                }
                if(element.tagName == "EMAIL"){
                    Strophe.forEachChild(element, "USERID", function(email) {
                        buddyObj.Email = email.textContent;
                    });
                }
                if(element.tagName == "PHOTO"){
                    Strophe.forEachChild(element, "BINVAL", function(base64) {
                        imgBase64 = "data:image/webp;base64,"+ base64.textContent;  // data:image/png;base64,
                    });
                }
            });
        });

        // Save To DB
        var buddyJson = {};
        var itemId = -1;
        var json = JSON.parse(localDB.getItem(profileUserID + "-Buddies"));
        $.each(json.DataCollection, function (i, item) {
            if(item.uID == buddyObj.identity){
                buddyJson = item;
                itemId = i;
                return false;
            }
        });

        if(itemId != -1){

            buddyJson.MobileNumber = buddyObj.MobileNumber;
            buddyJson.ContactNumber1 = buddyObj.ContactNumber1;
            buddyJson.ContactNumber2 = buddyObj.ContactNumber2;
            buddyJson.DisplayName = buddyObj.CallerIDName;
            buddyJson.Description = buddyObj.Desc;
            buddyJson.Email = buddyObj.Email;

            json.DataCollection[itemId] = buddyJson;
            localDB.setItem(profileUserID + "-Buddies", JSON.stringify(json));
        }

        if(imgBase64 != ""){
            // console.log(buddyObj);
            console.log("Buddy: "+  buddyObj.CallerIDName + " picture updated");

            localDB.setItem("img-"+ buddyObj.identity + "-"+ buddyObj.type, imgBase64);
            $("#contact-"+ buddyObj.identity +"-picture-main").css("background-image", 'url('+ getPicture(buddyObj.identity, buddyObj.type, true) +')');
        }
        UpdateBuddyList();

    }, function(e){
        console.warn("Error in XmppGetBuddyVcard", e);
    }, 30 * 1000);
}

// XMPP Messaging
// ==============
function onMessage(message){
    // console.log('onMessage', message);

    var from = message.getAttribute("from");
    var fromJid = Strophe.getBareJidFromJid(from);
    var to = message.getAttribute("to");
    var messageId = message.getAttribute("id");

    // Determin Buddy
    var buddyObj = FindBuddyByJid(fromJid);
    if(buddyObj == null) {
        // You don't appear to be a buddy of mine

        // TODO: Handle this
        console.warn("Spam!"); // LOL :)
        return true;
    }

    var isDelayed = false;
    var DateTime = utcDateNow();
    Strophe.forEachChild(message, "delay", function(elem) {
        // Delay message received
        if(elem.getAttribute("xmlns") == "urn:xmpp:delay"){
            isDelayed = true;
            DateTime = moment(elem.getAttribute("stamp")).utc().format("YYYY-MM-DD HH:mm:ss UTC");
        }
    });
    var originalMessage = "";
    Strophe.forEachChild(message, "body", function(elem) {
        // For simplicity, this code is assumed to take the last body
        originalMessage = elem.textContent;
    });


    // chatstate
    var chatstate = "";
    Strophe.forEachChild(message, "composing", function(elem) {
        if(elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates"){
            chatstate = "composing";
        }
    });
    Strophe.forEachChild(message, "paused", function(elem) {
        if(elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates"){
            chatstate = "paused";
        }
    });
    Strophe.forEachChild(message, "active", function(elem) {
        if(elem.getAttribute("xmlns") == "http://jabber.org/protocol/chatstates"){
            chatstate = "active";
        }
    });
    if(chatstate == "composing"){
        if(!isDelayed) XmppShowComposing(buddyObj);
        return true;
    }
    else {
        XmppHideComposing(buddyObj);
    }

    // Message Correction
    var isCorrection = false;
    var targetCorrectionMsg = "";
    Strophe.forEachChild(message, "replace", function(elem) {
        if(elem.getAttribute("xmlns") == "urn:xmpp:message-correct:0"){
            isCorrection = true;
            Strophe.forEachChild(elem, "id", function(idElem) {
                targetCorrectionMsg = idElem.textContent;
            });
        }
    });
    if(isCorrection && targetCorrectionMsg != "") {
        console.log("Message "+ targetCorrectionMsg +" for "+ buddyObj.CallerIDName +" was corrected");
        CorrectMessage(buddyObj, targetCorrectionMsg, originalMessage);
    }

    // Delivery Events
    var eventStr = "";
    var targetDeliveryMsg = "";
    Strophe.forEachChild(message, "x", function(elem) {
        if(elem.getAttribute("xmlns") == "jabber:x:event"){
            // One of the delivery events occured
            Strophe.forEachChild(elem, "delivered", function(delElem) {
                eventStr = "delivered";
            });
            Strophe.forEachChild(elem, "displayed", function(delElem) {
                eventStr = "displayed";
            });
            Strophe.forEachChild(elem, "id", function(idElem) {
                targetDeliveryMsg = idElem.textContent;
            });
        }
    });
    if(eventStr == "delivered" && targetDeliveryMsg != "") {
        console.log("Message "+ targetDeliveryMsg +" for "+ buddyObj.CallerIDName +" was delivered");
        MarkDeliveryReceipt(buddyObj, targetDeliveryMsg, true);

        return true;
    }
    if(eventStr == "displayed" && targetDeliveryMsg != "") {
        console.log("Message "+ targetDeliveryMsg +" for "+ buddyObj.CallerIDName +" was displayed");
        MarkDisplayReceipt(buddyObj, targetDeliveryMsg, true);

        return true;
    }

    // Messages
    if(originalMessage == ""){
        // Not a full message
    }
    else {
        if(messageId) {
            // Although XMPP does not require message ID's, this application does
            XmppSendDeliveryReceipt(buddyObj, messageId);

            AddMessageToStream(buddyObj, messageId, "MSG", originalMessage, DateTime)
            UpdateBuddyActivity(buddyObj.identity);
            var streamVisible = $("#stream-"+ buddyObj.identity).is(":visible");
            if (streamVisible) {
                MarkMessageRead(buddyObj, messageId);
                XmppSendDisplayReceipt(buddyObj, messageId);
            }
            RefreshStream(buddyObj);
            ActivateStream(buddyObj, originalMessage);
        }
        else {
            console.warn("Sorry, messages must have an id ", message)
        }
    }

    return true;
}
function XmppShowComposing(buddyObj){
    console.log("Buddy is composing a message...");
    $("#contact-"+ buddyObj.identity +"-chatstate").show();
    $("#contact-"+ buddyObj.identity +"-presence").hide();
    $("#contact-"+ buddyObj.identity +"-presence-main").hide();
    $("#contact-"+ buddyObj.identity +"-chatstate-menu").show();
    $("#contact-"+ buddyObj.identity +"-chatstate-main").show();

    updateScroll(buddyObj.identity);
}
function XmppHideComposing(buddyObj){
    console.log("Buddy composing is done...");
    $("#contact-"+ buddyObj.identity +"-chatstate").hide();
    $("#contact-"+ buddyObj.identity +"-chatstate-menu").hide();
    $("#contact-"+ buddyObj.identity +"-chatstate-main").hide();
    $("#contact-"+ buddyObj.identity +"-presence").show();
    $("#contact-"+ buddyObj.identity +"-presence-main").show();

    updateScroll(buddyObj.identity);
}
function XmppSendMessage(buddyObj,message, messageId, thread, markable, type){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    if(!type) type = "normal"; // chat | error | normal | groupchat | headline
    var msg = $msg({"to": buddyObj.jid, "type": type, "id" : messageId, "from" : XMPP.jid})
    if(thread && thread != ""){
        msg.c("thread").t(thread);
        msg.up();
    }
    msg.c("body").t(message); 
    // XHTML-IM
    msg.up();
    msg.c("active", {"xmlns": "http://jabber.org/protocol/chatstates"});
    msg.up();
    msg.c("x", {"xmlns": "jabber:x:event"});
    msg.c("delivered");
    msg.up();
    msg.c("displayed");

    console.log("sending message...");
    buddyObj.chatstate = "active";
    if(buddyObj.chatstateTimeout){
        window.clearTimeout(buddyObj.chatstateTimeout);
    }
    buddyObj.chatstateTimeout = null;

    try{
        XMPP.send(msg);
        MarkMessageSent(buddyObj, messageId, false);
    }
    catch(e){
        MarkMessageNotSent(buddyObj, messageId, false);
    }
}
function XmppStartComposing(buddyObj, thread){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    if(buddyObj.jid == null || buddyObj.jid == "") return;

    if(buddyObj.chatstateTimeout){
        window.clearTimeout(buddyObj.chatstateTimeout);
    }
    buddyObj.chatstateTimeout = window.setTimeout(function(){
        XmppPauseComposing(buddyObj, thread);
    }, 10 * 1000);

    if(buddyObj.chatstate && buddyObj.chatstate == "composing") return;

    var msg = $msg({"to": buddyObj.jid, "from" : XMPP.jid})
    if(thread && thread != ""){
        msg.c("thread").t(thread);
        msg.up();
    }
    msg.c("composing", {"xmlns": "http://jabber.org/protocol/chatstates"});

    console.log("you are composing a message...")
    buddyObj.chatstate = "composing";

    XMPP.send(msg);
}
function XmppPauseComposing(buddyObj, thread){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    if(buddyObj.jid == null || buddyObj.jid == "") return;

    if(buddyObj.chatstate && buddyObj.chatstate == "paused") return;

    var msg = $msg({"to": buddyObj.jid, "from" : XMPP.jid})
    if(thread && thread != ""){
        msg.c("thread").t(thread);
        msg.up();
    }
    msg.c("paused", {"xmlns": "http://jabber.org/protocol/chatstates"});

    console.log("You have paused your message...");
    buddyObj.chatstate = "paused";
    if(buddyObj.chatstateTimeout){
        window.clearTimeout(buddyObj.chatstateTimeout);
    }
    buddyObj.chatstateTimeout = null;

    XMPP.send(msg);
}
function XmppSendDeliveryReceipt(buddyObj, id){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var msg = $msg({"to": buddyObj.jid, "from" : XMPP.jid});
    msg.c("x", {"xmlns": "jabber:x:event"});
    msg.c("delivered");
    msg.up();
    msg.c("id").t(id);

    console.log("sending delivery notice for "+ id +"...");

    XMPP.send(msg);
}
function XmppSendDisplayReceipt(buddyObj, id){
    if(!XMPP || XMPP.connected == false) {
        console.warn("XMPP not connected");
        return;
    }

    var msg = $msg({"to": buddyObj.jid, "from" : XMPP.jid});
    msg.c("x", {"xmlns": "jabber:x:event"});
    msg.c("displayed");
    msg.up();
    msg.c("id").t(id);

    console.log("sending display notice for "+ id +"...");

    XMPP.send(msg);
}

// XMPP Other
// ==========
function onPingRequest(iq){
    // Handle Ping Pong
    // <iq type="get" id="86-14" from="localhost" to="websocketuser@localhost/cc9fd219" >
    //     <ping xmlns="urn:xmpp:ping"/>
    // </iq>
    var id = iq.getAttribute("id");
    var to = iq.getAttribute("to");
    var from = iq.getAttribute("from");

    var iq_response = $iq({'type':'result', 'id':id, 'to':from, 'from':to});
    XMPP.send(iq_response);

    return true;
}
function onVersionRequest(iq){
    // Handle Request for our version etc
    // <iq xmlns="jabber:client" type="get" id="419-24" to=".../..." from="innovateasterisk.com">
    //     <query xmlns="jabber:iq:version"/>
    // </iq>
    var id = iq.getAttribute("id");
    var to = iq.getAttribute("to");
    var from = iq.getAttribute("from");

    var iq_response = $iq({'type':'result', 'id':id, 'to':from, 'from':to});
    iq_response.c('query', {'xmlns':'jabber:iq:version'});
    iq_response.c('name', null, 'Browser Phone');
    iq_response.c('version', null, '0.0.1');
    iq_response.c('os', null, 'Browser');
    XMPP.send(iq_response);

    return true;
}


function onInfoQuery(iq){
    console.log('onInfoQuery', iq);

    // Probably a result
    return true;
}
function onInfoQueryRequest(iq){
    console.log('onInfoQueryRequest', iq);

    var query = ""; // xml.find("iq").find("query").attr("xmlns");
    Strophe.forEachChild(iq, "query", function(elem) {
        query = elem.getAttribute("xmlns");
    });
    console.log(query);

    // ??
    return true;
}
function onInfoQueryCommand(iq){
    console.log('onInfoQueryCommand', iq);

    var query = ""; // xml.find("iq").find("query").attr("xmlns");
    Strophe.forEachChild(iq, "query", function(elem) {
        query = elem.getAttribute("xmlns");
    });
    console.log(query);

    // ??
    return true;
}
function XMPP_GetGroups(){
    var iq_request = $iq({"type" : "get", "id" : XMPP.getUniqueId(), "to" : XmppChatGroupService +"."+ XmppDomain, "from" : XMPP.jid});
    iq_request.c("query", {"xmlns" : "http://jabber.org/protocol/disco#items", "node" : "http://jabber.org/protocol/muc#rooms"});

    XMPP.sendIQ(iq_request, function (result){
        console.log("GetGroups Response: ", result);
    }, function(e){
        console.warn("Error in GetGroups", e);
    }, 30 * 1000);
}
function XMPP_GetGroupMembers(){
    var iq_request = $iq({"type" : "get", "id" : XMPP.getUniqueId(), "to" : "directors@"+ XmppChatGroupService +"."+ XmppDomain, "from" : XMPP.jid});
    iq_request.c("query", {"xmlns":"http://jabber.org/protocol/disco#items"});

    XMPP.sendIQ(iq_request, function (result){
        console.log("GetGroupMembers Response: ", result);
    }, function(e){
        console.warn("Error in GetGroupMembers", e);
    }, 30 * 1000);
}
function XMPP_JoinGroup(){
    var pres_request = $pres({"id" : XMPP.getUniqueId(), "from" : XMPP.jid, "to" : "directors@"+ XmppChatGroupService +"."+ XmppDomain +"/nickname" });
    pres_request.c("x", {"xmlns" : "http://jabber.org/protocol/muc" });

    XMPP.sendPresence(pres_request, function (result){
        console.log("JoinGroup Response: ", result);
    }, function(e){
        console.warn("Error in Set Presence", e);
    }, 30 * 1000);
}
function XMPP_QueryMix(){
    var iq_request = $iq({"type" : "get", "id" : XMPP.getUniqueId(), "from" : XMPP.jid});
    iq_request.c("query", {"xmlns" : "http://jabber.org/protocol/disco#info"});

    XMPP.sendIQ(iq_request, function (result){
        console.log("XMPP_QueryMix Response: ", result);
    }, function(e){
        console.warn("Error in XMPP_QueryMix", e);
    }, 30 * 1000);
}

var XMPP = null;
var reconnectXmpp = function(){
    console.log("Connect/Reconnect XMPP connection...");

    if(XMPP) XMPP.disconnect("");
    if(XMPP) XMPP.reset();

    var xmpp_websocket_uri = "wss://"+ XmppServer +":"+ XmppWebsocketPort +""+ XmppWebsocketPath; 
    var xmpp_username = profileUser +"@"+ XmppDomain; // Xmpp Doesnt like Uppercase 
    if(XmppRealm != "" && XmppRealmSeparator) xmpp_username = XmppRealm + XmppRealmSeparator + xmpp_username;
    // may need to add /instanceID
    xmpp_username = xmpp_username.toLowerCase();
    var xmpp_password = SipPassword;

    XMPP = null;
    if(XmppDomain == "" || XmppServer == "" || XmppWebsocketPort == "" || XmppWebsocketPath == ""){
        console.log("Cannot connect to XMPP: ", XmppDomain, XmppServer, XmppWebsocketPort, XmppWebsocketPath);
        return;
    }
    XMPP = new Strophe.Connection(xmpp_websocket_uri);

    // XMPP.rawInput = function(data){
    //     console.log('RECV:', data);
    // }
    // XMPP.rawOutput = function(data){
    //     console.log('SENT:', data);
    // }

    // Information Query
    XMPP.addHandler(onPingRequest, "urn:xmpp:ping", "iq", "get");
    XMPP.addHandler(onVersionRequest, "jabber:iq:version", "iq", "get");

    // Presence
    XMPP.addHandler(onPresenceChange, null, "presence", null);
    // Message
    XMPP.addHandler(onMessage, null, "message", null);

    console.log("XMPP connect...");

    XMPP.connect(xmpp_username, xmpp_password, onStatusChange);
}