# Qencode WebRTC kit

### Getting started

This is the simplest example of sending a device media stream such as a webcam to WebRTC Provider.

```JavaScript
// Connection URL
let webSocketUrl = ""

// Initialize QenocdeWebRTC
let qencodeWebRTC = QencodeWebRTC.create();

// Attach user video
qencodeWebRTC.attachMedia(document.getElementById('userVideo'));

// Get media stream from user device and start stream
qencodeWebRTC.getUserMedia({
    audio: true,
    video: true
}).then(function () {
    // Got device stream and start streaming
    qencodeWebRTC.startStreaming(webSocketUrl);
});
```

## Configurations & APIs

- [`Initialization and destroying instance`](#)
  - `QencodeWebRTC.create()`
  - `Configuration`
  - `instance.remove()`
- [`Input device listing`](#)
  - `QencodeWebRTC.getDevices()`
- [`Media APIs`](#)
  - `instance.attachMedia(videoElement)`
  - `instance.getUserMedia()`
- [`Streaming APIs`](#)
  - `instance.startStreaming()`

### Initialization and destroying instance

Configuration parameters could be provided to QencodeWebRTC.js upon instantiation of the QencodeWebRTC object.

```JavaScript
// Configuration
var config = {
    callbacks: {
        error: function (error) {

        },
        connected: function (event) {

        },
        connectionClosed: function (type, event) {

        },
        iceStateChange: function (state) {

        }
    }
}

// Initialize qencodeWebRTC instance
let qencodeWebRTC = QencodeWebRTC.create(config);

// Release all resources and destroy the instance
qencodeWebRTC.remove();
```

#### `QencodeWebRTC.create(config)`

- parameters
  - config: [Initialization configurations](#).
- Initialize QencodeWebRTC instance.

##### `callbacks.error`

- type
  - Function
- parameters
  - error: Various Type of Error
- A callback that receives any errors that occur in an instance of QencodeWebRTC.
- Errors are could occur from `getUserMedia`, `webSocket`, or `peerConnection`.

##### `callbacks.connected`

- type
  - Function
- parameters
  - event: event object of iceconnectionstatechange
- This is a callback that occurs when the `RTCPeerConnection.iceConnectionState` becomes `connected`.
- It means that the media stream is normally being transmitted to WebRTC Provider.

##### `callbacks.connectionClosed`

- type
  - Function
- parameters
  - type: (`ice` | `websocket`) Notes which connection is closed.
  - event: event object of iceconnectionstatechange or websocket
- A callback that is fired when the websocket's `onclose` event occurs, or when `RTCPeerConnection.iceConnectionState` changes to `failed`, `disconnected`, or `closed`.
- It may be that the media stream is not being sent normally to WebRTC Provider.

##### `callbacks.iceStateChange`

- type
  - Function
- parameters
  - event: event object of iceconnectionstatechange
- A callback that fires whenever [`RTCPeerConnection.iceConnectionState`](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) changes.
- This is useful when checking the current streaming status.

#### `instance.remove()`

- Release all resources(websocket, peerconnection, mediastream) and destroy the instance.

### Input device listing

QencodeWebRTC provides an API to get a list of user devices for convenience.

```JavaScript
// Lists the available media input and output devices
QencodeWebRTC.getDevices().then(function (devices) {

    // Got a list of user devices
    console.log(devices);

    /*
    console output is

    {
        "videoinput": [
            {
                "deviceId": "b1ab3a7041b1c9a91037b51d9c380f599f3914297b5c0ce2eb8d385dab3b8812",
                "label": "c922 Pro Stream Webcam (046d:085c)"
            }
        ],
        "audioinput": [
            {
                "deviceId": "default",
                "label": "default - Microphone(C922 Pro Stream Webcam) (046d:085c)"
            },
            {
                "deviceId": "communications",
                "label": "Communication - Microphone(C922 Pro Stream Webcam) (046d:085c)"
            },
            {
                "deviceId": "2feb7f29a130802404f47d8ad9adc9418b1a01e0a4d37e60335771aba21f328d",
                "label": "Microphone(C922 Pro Stream Webcam) (046d:085c)"
            }
        ],
        "audiooutput": [
            {
                "deviceId": "default",
                "label": "default - Headphone(2- Xbox Controller) (045e:02f6)"
            },
            {
                "deviceId": "communications",
                "label": "Communication - Headphone(2- Xbox Controller) (045e:02f6)"
            },
            {
                "deviceId": "c3d04828621712f9cc006c49486218aca0d89619ac9993809d5f082a2d13a6b0",
                "label": "Headphone(2- Xbox Controller) (045e:02f6)"
            },
        ],
        "other": []
    }
    */

}).catch(function (error) {

    // Failed to get a list of user devices
    console.log(error);
});
```

#### `QencodeWebRTC.getDevices()`

- This static method lists the available media input and output devices, such as microphones, cameras, headsets, and so forth.
- `videoinput`, `audioinput`, `audiooutput`, `other` is available input/output devices. You can use `deviceId` to specify a device to streaming or `label` to make device selection UI.

### Media APIs

QencodeWebRTC also provides APIs to control a media stream from a user device.

```HTML
<video id="myVideo"></video>
```

```JavaScript
// Create instance
let qencodeWebRTC = QencodeWebRTC.create();

// Attaching video element for playing device stream
qencodeWebRTC.attachMedia(document.getElementById('myVideo'));

// Gets a device stream with a constraint that specifies the type of media to request.
qencodeWebRTC.getUserMedia(constraints).then(function (stream) {

    // Got device stream. Ready for streaming.
}).catch(function (error) {

    // Failed to get device stream.
});
```

#### `instance.attachMedia(videoElement)`

- parameters
  - videoElement: HTML `<video>` element
- If the video element is attached, when the media stream is received from the user device, it starts playing in the automatically set video element.
- This can be useful when previewing the media stream you want to stream.

#### `instance.getUserMedia(constraints)`

- parameters
  - constraints: [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints) dictionary. If not set the optimal input that the browser thinks is selected.
- returns Promise
  - resolved
    - stream: [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream). You can use this stream for whatever you need.
  - rejected
    - error: Throws error while getting the stream from the user device.
- You can get the media stream from any user input device you want using the `constraints` parameter. The device ID to be used in the `constraints` parameter can also be obtained from `QencodeWebRTC.getDevices()`.
- For natural behavior, you can have the browser automatically select the device stream without passing a `constraints` parameter. However, if you want to control the device stream strictly (e.g., specify input devices, video resolution, video frame rates), you can control it by passing the constraints parameter.
