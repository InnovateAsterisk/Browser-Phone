# Browser Phone
A fully featured browser based WebRTC SIP phone for Asterisk

### Description
This web application designed to work with Asterisk PBX (supported versions unknown). Once loaded application will connect to Asterisk PBX on its web socket, and register an extension. Calls are made between contacts, and a full call detail is saved. Audio Calls can be recorded. Video Calls can be recorded, and can be saved with 5 different recording layouts and 3 different quality settings. This application does not use any cloud systems or services, and is designed to be stand-alone. Additional libraries will be downloaded at run time (but can also be saved to the web server for a complete off-line solution).

![Image of Main Interface](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/AudioCall.jpg)

## Features
- SIP Audio Calling
- SIP Video Calling
- Call Transfer (Both Blind & Attended)
- 3rd Party Conference Call
- Call Detail Records
- Call Recording (Audio & Video)
- Screen Share during Video Call
- Scratchpad Share during Video Call
- Video/Audio File Share during Video Call
- SIP (text/plain) Messaging
- SIP Message Accept Notification (not delivery)
- Buddy (Contact) Management
- Useful debug messages sent to console.

## Dependencies
- Asterisk PBX (with WebRTC and Messaging)
- sip-0.11.6.js                        : WebRTC and SIP signaling library
- jquery-3.3.1.min.js                  : JavaScript toolkit
- jquery.md5-min.js                    : Md5 Hash plug-in (unused)
- Chart.bundle-2.7.2.js                : Graph and Chart UI
- dhtmlx.js                            : Windowing & UI Library
- fabric-2.4.6.min.js                  : Canvas Editing Library
- moment-with-locales-2.24.0.min.js    : Date & Time Libary
- croppie.min.js                       : Profile Picture Crop Library
Note: These libraries will load automatically from CDN.

## Screenshots

![Audio Call with 3rd Party Conference](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/AudioCall_Conference.jpg)

![Audio Call with Transfer](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/AudioCall_Transfer.jpg)

![Buddy Stream](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/Buddy_Stream.jpg)

![Message Dictate](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/DictateMessage.jpg)

![Call Stats](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/InCall_Stats.png)

![Call Recording Format](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/Recording_Format.jpg)

![Video Call Presenting Camera](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/VideoCall_PresentCamera.jpg)

![Video Call Presenting Scratchpad](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/VideoCall_PresentScratchpad.jpg)

![Video Call Presenting Video File](https://github.com/InnovateAsterisk/Browser-Phone/blob/master/Screenshots/VideoCall_PresentVideo.jpg)