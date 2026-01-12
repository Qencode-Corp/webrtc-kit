interface QencodeWebRTCStatic {
  create(config?: CreateConfig): QencodeWebRtcInstance;
  getDevices(): Promise<Devices>;
}

const QencodeWebRTC: QencodeWebRTCStatic = {} as QencodeWebRTCStatic;

const logHeader = 'QencodeWebRTC.js :';
const logEventHeader = 'QencodeWebRTC.js :';

type WebSocketMessage =
  | {
      command: 'request_offer';
    }
  | {
      id: string;
      peer_id: string | number; // todo clarify
      command: 'candidate';
      candidates: RTCIceCandidate[];
    }
  | {
      id: string;
      peer_id: string | number; // todo clarify
      command: 'answer';
      sdp: RTCSessionDescriptionInit;
    }
  | {
      id: string;
      peer_id: string | number; // todo clarify
      command: 'stop';
    };

// private methods
function sendMessage(webSocket: WebSocket, message: WebSocketMessage) {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    webSocket.send(JSON.stringify(message));
  }
}

function generateDomainFromUrl(url: string) {
  let result = '';
  let match;
  if ((match = url.match(/^(?:wss?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/im))) {
    result = match[1];
  }

  return result;
}

function findIp(string: string) {
  let result = '';
  let match;

  if (
    (match = string.match(
      new RegExp(
        '\\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
        'gi'
      )
    ))
  ) {
    result = match[0];
  }

  return result;
}

function checkIOSVersion() {
  var agent = window.navigator.userAgent,
    start = agent.indexOf('OS ');
  if ((agent.indexOf('iPhone') > -1 || agent.indexOf('iPad') > -1) && start > -1) {
    return window.Number(agent.substr(start + 3, 3).replace('_', '.'));
  }
  return 0;
}

// SDP helper functions to properly handle CRLF line endings (RFC 4566)
function splitSdpLines(sdp: string) {
  // Normalize line endings: split on \r\n or \n, and remove trailing \r from each line
  return sdp.split(/\r?\n/).map((line) => line.replace(/\r$/, ''));
}

function joinSdpLines(lines: string[]) {
  // Join with CRLF as required by SDP specification (RFC 4566)
  return lines.join('\r\n');
}

function getFormatNumber(sdp, format) {
  const lines = splitSdpLines(sdp);
  let formatNumber = -1;

  for (let i = 0; i < lines.length - 1; i++) {
    lines[i] = lines[i].toLowerCase();

    if (lines[i].indexOf('a=rtpmap') > -1 && lines[i].indexOf(format.toLowerCase()) > -1) {
      // parsing "a=rtpmap:100 H264/90000" line
      formatNumber = lines[i].split(' ')[0].split(':')[1];
      break;
    }
  }

  return formatNumber;
}

function removeFormat(sdp, formatNumber) {
  let newLines = [];
  let lines = splitSdpLines(sdp);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('m=video') === 0) {
      newLines.push(lines[i].replace(' ' + formatNumber + '', ''));
    } else if (lines[i].indexOf(formatNumber + '') > -1) {
    } else {
      newLines.push(lines[i]);
    }
  }

  return joinSdpLines(newLines);
}

async function getStreamForDeviceCheck() {
  // High resolution video constraints makes browser to get maximum resolution of video device.
  // Using 'ideal' instead of exact values for better compatibility with different cameras.
  const constraints = {
    audio: { deviceId: undefined },
    video: { deviceId: undefined, width: { ideal: 1920 }, height: { ideal: 1080 } },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  // [FIX] Stop tracks immediately to release the camera for the actual app
  stream.getTracks().forEach((track) => track.stop());
  return stream;
}

async function getDevices() {
  return await navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos: MediaDeviceInfo[]): Devices {
  let devices = {
    audioinput: [],
    audiooutput: [],
    videoinput: [],
    other: [],
  };

  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];

    let info = {};

    info.deviceId = deviceInfo.deviceId;

    if (deviceInfo.kind === 'audioinput') {
      info.label = deviceInfo.label || `microphone ${devices.audioinput.length + 1}`;
      devices.audioinput.push(info);
    } else if (deviceInfo.kind === 'audiooutput') {
      info.label = deviceInfo.label || `speaker ${devices.audiooutput.length + 1}`;
      devices.audiooutput.push(info);
    } else if (deviceInfo.kind === 'videoinput') {
      info.label = deviceInfo.label || `camera ${devices.videoinput.length + 1}`;
      devices.videoinput.push(info);
    } else {
      info.label = deviceInfo.label || `other ${devices.other.length + 1}`;
      devices.other.push(info);
    }
  }

  return devices;
}

interface Candidate {
  sdpMLineIndex: number;
  candidate: string;
}

interface IceServer {
  credential: string;
  urls: string[];
  user_name: string;
}

interface Offer {
  sdp: string;
  type: 'offer';
}

interface ConnectionConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  maxVideoBitrate?: number;
  sdp?: {
    appendFmtp?: string;
  };
}

interface ConnectionData {
  id: string;
  peerId: string | number;
}

interface Callbacks {
  error?: (error: any) => void;
  connected?: (event: Event) => void;
  connectionClosed?: (source: 'websocket' | 'ice', event: Event | CloseEvent) => void;
  iceStateChange?: (state: RTCIceConnectionState) => void;
}

interface CreateConfig {
  callbacks?: Callbacks;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface Devices {
  audioinput: DeviceInfo[];
  audiooutput: DeviceInfo[];
  videoinput: DeviceInfo[];
  other: DeviceInfo[];
}

interface QencodeWebRtcInstance {
  // Configuration properties
  retryMaxCount: number;
  retryDelay: number;
  connectionConfig: ConnectionConfig;
  connectionUrl: string | null;
  iceTransportPolicy?: RTCIceTransportPolicy;

  // State properties
  connectStarted: boolean;
  error: any;
  offerRequestCount: number;
  retriesUsed: number;
  isManualStop: boolean;

  // Connection properties
  peerConnection: RTCPeerConnection | null;
  webSocket: WebSocket | null;
  webSocketCloseEvent: CloseEvent | null;
  connectionData?: ConnectionData;

  // Media properties
  stream: MediaStream | null;
  videoElement: HTMLVideoElement | null;

  // Internal state
  iceDisconnectTimeoutId?: NodeJS.Timeout | null;
  reconnectWebSocketPromise?: Promise<void> | null;
  iceLastEvent?: Event;
  callbacks: Callbacks;

  // Methods
  attachMedia(videoElement: HTMLVideoElement): void;
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream>;
  switchToCamera(
    deviceId: string,
    extraVideoConstraints?: MediaTrackConstraints
  ): Promise<MediaStream>;
  hasActiveConnection(): boolean;
  startStreaming(connectionUrl: string, connectionConfig?: ConnectionConfig): void;
  closePeerConnection(): void;
  closeWebSocket(): void;
  closeVideoAudioStreams(): void;
  remove(): void;
}

function initConfig(config?: CreateConfig) {
  let instance: QencodeWebRtcInstance = {
    retryMaxCount: 2,
    retryDelay: 2000,
    connectionConfig: {},
    connectionUrl: null,
    connectStarted: false,
    error: null,
    offerRequestCount: 0,
    peerConnection: null,
    retriesUsed: 0,
    stream: null,
    videoElement: null,
    webSocket: null,
    webSocketCloseEvent: null,
    isManualStop: false,
  };

  if (config && config.callbacks) {
    instance.callbacks = config.callbacks;
  } else {
    instance.callbacks = {};
  }

  return instance;
}

function waitForOnline() {
  if (navigator.onLine) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    console.log('Offline. Waiting for connection...');
    // Use { once: true } to auto-remove the listener after it fires
    window.addEventListener(
      'online',
      () => {
        console.log('Back online!');
        resolve();
      },
      { once: true }
    );
  });
}

function delayedCall(fn, args, delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      Promise.resolve(fn(...args)).then(resolve);
    }, delay);
  });
}

// From https://webrtchacks.com/limit-webrtc-bandwidth-sdp/
function setBitrateLimit(sdp, media, bitrate) {
  let lines = splitSdpLines(sdp);
  let line = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('m=' + media) === 0) {
      line = i;
      break;
    }
  }
  if (line === -1) {
    // Could not find the m line for media
    return sdp;
  }

  // Pass the m line
  line++;

  // Skip i and c lines
  while (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0) {
    line++;
  }

  // If we're on a b line, replace it
  if (lines[line].indexOf('b') === 0) {
    lines[line] = 'b=AS:' + bitrate;

    return joinSdpLines(lines);
  }

  // Add a new b line
  let newLines = lines.slice(0, line);

  newLines.push('b=AS:' + bitrate);
  newLines = newLines.concat(lines.slice(line, lines.length));

  return joinSdpLines(newLines);
}

function appendFmtp(fmtpStr, sdp) {
  const lines = splitSdpLines(sdp);
  const payloads = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('m=video') === 0) {
      let tokens = lines[i].split(' ');

      for (let j = 3; j < tokens.length; j++) {
        payloads.push(tokens[j]);
      }

      break;
    }
  }

  for (let i = 0; i < payloads.length; i++) {
    let fmtpLineFound = false;

    for (let j = 0; j < lines.length; j++) {
      if (lines[j].indexOf('a=fmtp:' + payloads[i]) === 0) {
        fmtpLineFound = true;
        lines[j] += ';' + fmtpStr;
      }
    }

    if (!fmtpLineFound) {
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].indexOf('a=rtpmap:' + payloads[i]) === 0) {
          lines[j] += '\r\na=fmtp:' + payloads[i] + ' ' + fmtpStr;
        }
      }
    }
  }

  return joinSdpLines(lines);
}

function addMethod(instance: QencodeWebRtcInstance) {
  function errorHandler(error) {
    instance.error = error;
    if (typeof instance.callbacks?.error === 'function') {
      try {
        instance.callbacks.error(error);
      } catch (callbackError) {
        console.error(logHeader, 'Error in error callback', callbackError);
      }
    }
  }
  async function replaceTracksInPeerConnection(newStream: MediaStream) {
    if (!instance.peerConnection || !newStream) {
      return {
        replacedVideo: false,
        replacedAudio: false,
        oldVideoTrack: null,
        oldAudioTrack: null,
        newVideoTrack: null,
        newAudioTrack: null,
      };
    }

    const pc = instance.peerConnection;
    const newVideoTrack = newStream.getVideoTracks()[0] || null;
    const newAudioTrack = newStream.getAudioTracks()[0] || null;

    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video') || null;
    const audioSender = senders.find((s) => s.track && s.track.kind === 'audio') || null;

    const oldVideoTrack = videoSender?.track || null;
    const oldAudioTrack = audioSender?.track || null;

    let replacedVideo = false;
    let replacedAudio = false;

    // replaceTracksInPeerConnection gracefully handles the missing audio track in the new stream by skipping the audio replacement logic. This ensures that the microphone input is never interrupted, which is a common pain point in WebRTC implementations.
    if (newVideoTrack && videoSender) {
      try {
        await videoSender.replaceTrack(newVideoTrack);
        replacedVideo = true;
        console.info(logHeader, 'Replaced video track in peer connection');
      } catch (error) {
        console.error(logHeader, 'Error replacing video track', error);
        errorHandler(error);
      }
    } else if (newVideoTrack && !videoSender) {
      // sender.replaceTrack only works if a sender for that media type already exists.
      console.warn(logHeader, 'No video sender found; cannot replaceTrack without renegotiation.');
    }

    if (newAudioTrack && audioSender) {
      try {
        await audioSender.replaceTrack(newAudioTrack);
        replacedAudio = true;
        console.info(logHeader, 'Replaced audio track in peer connection');
      } catch (error) {
        console.error(logHeader, 'Error replacing audio track', error);
        errorHandler(error);
      }
    } else if (newAudioTrack && !audioSender) {
      console.warn(logHeader, 'No audio sender found; cannot replaceTrack without renegotiation.');
    }

    return {
      replacedVideo,
      replacedAudio,
      oldVideoTrack,
      oldAudioTrack,
      newVideoTrack,
      newAudioTrack,
    };
  }
  function getUserMedia(constraints): Promise<MediaStream> {
    if (!constraints) {
      constraints = {
        video: {
          deviceId: undefined,
        },
        audio: {
          deviceId: undefined,
        },
      };
    }

    return navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async function (stream) {
        console.info(logHeader, 'Received Media Stream From Input Device', stream);

        return await replaceStream(stream);
      })
      .catch(function (error) {
        console.error(logHeader, "Can't Get Media Stream From Input Device", error);
        errorHandler(error);
        throw error;
      });
  }

  async function replaceStream(stream: MediaStream) {
    const hasActiveConnection = instance.hasActiveConnection();
    const oldStream = instance.stream;

    if (hasActiveConnection && oldStream) {
      const rep = await replaceTracksInPeerConnection(stream);

      if (rep.replacedVideo) {
        oldStream.getVideoTracks().forEach((t) => t.stop());
      }
      if (rep.replacedAudio) {
        oldStream.getAudioTracks().forEach((t) => t.stop());
      }

      // Compose: screen video + keep existing mic if screen share has no audio
      const composed = new MediaStream();

      if (rep.newVideoTrack) {
        composed.addTrack(rep.newVideoTrack);
      } else if (oldStream.getVideoTracks()[0]) {
        composed.addTrack(oldStream.getVideoTracks()[0]);
      }

      if (rep.newAudioTrack) {
        composed.addTrack(rep.newAudioTrack);
      } else if (oldStream.getAudioTracks()[0]) {
        composed.addTrack(oldStream.getAudioTracks()[0]);
      }

      instance.stream = composed;

      const elem = instance.videoElement;
      if (elem) {
        elem.srcObject = composed;
        elem.onloadedmetadata = function (e) {
          elem.play();
        };
      }

      return composed;
    }

    instance.stream = stream;
    const elem = instance.videoElement;

    if (elem) {
      elem.srcObject = stream;
      elem.onloadedmetadata = function (e) {
        elem.play();
      };
    }

    return stream;
  }

  function getDisplayMedia(constraints) {
    if (!constraints) {
      constraints = {};
    }

    return navigator.mediaDevices
      .getDisplayMedia(constraints)
      .then(async function (stream) {
        console.info(logHeader, 'Received Media Stream From Display', stream);
        return await replaceStream(stream);
      })
      .catch(function (error) {
        console.error(logHeader, "Can't Get Media Stream From Display", error);
        errorHandler(error);
        throw error;
      });
  }

  // Switch only the camera (video sender) without touching microphone / audio sender.
  // It handles initial setup by requesting audio if no existing audio track is found.
  async function switchToCamera(deviceId: string) {
    // [FIX] Define default constraints to enforce 16:9 (HD) aspect ratio.
    const defaultConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      // Explicitly specify aspect ratio if width/height aren't enough. Looks important in practice.
      aspectRatio: { ideal: 1.7777777778 },
    };

    const finalVideoConstraints = {
      ...defaultConstraints,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    };
    console.log('finalVideoConstraints', finalVideoConstraints);

    // 1. Move oldStream retrieval UP to check for existing audio
    const oldStream = instance.stream;
    const oldAudioTrack = oldStream?.getAudioTracks?.()[0] ?? null;

    // 2. Determine if we need to request audio (Initial Setup vs Camera Switch)
    const shouldRequestAudio = !oldAudioTrack;

    // 3. Update constraints to request audio only if we don't have it
    const constraints = {
      video: finalVideoConstraints,
      audio: shouldRequestAudio,
    };

    let newCamStream: MediaStream;
    try {
      instance.getUserMediaError = null;
      newCamStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      // Don't set the global error yet. Only set it if fallback fails too.
      console.warn('High-res constraints failed, trying fallback...', e);

      const fallback = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: shouldRequestAudio,
      };

      try {
        newCamStream = await navigator.mediaDevices.getUserMedia(fallback as any);
        // Fallback succeeded! We can ignore the previous error.
      } catch (fallbackError) {
        // [FIX] Fallback failed too. NOW we report the error to the UI.
        instance.getUserMediaError = fallbackError;
        throw fallbackError;
      }
    }

    const hasActiveConnection = instance.hasActiveConnection();

    if (!hasActiveConnection || !oldStream) {
      // Stop ONLY the old camera tracks to release hardware
      if (oldStream) {
        oldStream.getVideoTracks().forEach((track) => track.stop());
      }

      // Build a composed stream
      const composed = new MediaStream();

      const newVideoTrack = newCamStream.getVideoTracks()[0];
      if (newVideoTrack) {
        composed.addTrack(newVideoTrack);
      }

      // 4. Logic to add the correct audio track
      if (shouldRequestAudio) {
        // Case A: Initial Setup - Use the NEW audio track we just requested
        const newAudioTrack = newCamStream.getAudioTracks()[0];
        if (newAudioTrack) {
          composed.addTrack(newAudioTrack);
        }
      } else if (oldAudioTrack) {
        // Case B: Switching - Keep the OLD audio track (seamless switch)
        composed.addTrack(oldAudioTrack);

        // Important: If we requested audio: false, newCamStream has no audio tracks,
        // so we don't need to stop anything there.
      }

      instance.stream = composed;

      if (instance.videoElement) {
        instance.videoElement.srcObject = composed;
      }

      return composed;
    }

    try {
      const rep = await replaceTracksInPeerConnection(newCamStream);

      if (rep.replacedVideo) {
        oldStream.getVideoTracks().forEach((t) => t.stop());
      } else {
        newCamStream.getTracks().forEach((t) => t.stop());
        return oldStream;
      }

      const composed = new MediaStream();

      if (rep.newVideoTrack) {
        composed.addTrack(rep.newVideoTrack);
      } else if (oldStream.getVideoTracks()[0]) {
        composed.addTrack(oldStream.getVideoTracks()[0]);
      }

      // We continue to use the existing audio for the local stream object
      // Note: If we added audio in 'shouldRequestAudio' mode while connected,
      // it won't be sent to the peer without renegotiation (replaceTrack fails for missing senders).
      // But this path is rarely hit for "Initial Setup" since !hasActiveConnection is usually true then.
      const existingAudio = oldStream.getAudioTracks()[0];
      if (existingAudio) {
        composed.addTrack(existingAudio);
      }

      instance.stream = composed;

      const elem = instance.videoElement;
      if (elem) {
        elem.srcObject = composed;
        elem.onloadedmetadata = function (e) {
          elem.play();
        };
      }

      return composed;
    } catch (error) {
      console.error(logHeader, 'Failed to switch camera', error);
      if (newCamStream) {
        newCamStream.getTracks().forEach((track) => track.stop());
      }

      throw error;
    }
  }

  function requestOffer() {
    sendMessage(instance.webSocket, {
      command: 'request_offer',
    });
    instance.offerRequestCount += 1;
  }

  async function addRetryToQueue(delay?: number) {
    if (instance.isManualStop) return;

    if (instance.reconnectWebSocketPromise) {
      // Just hitch a ride on the existing attempt and exit.
      await instance.reconnectWebSocketPromise;
      return;
    }

    const retryDelay = delay ?? instance.retryDelay;

    instance.reconnectWebSocketPromise = (async () => {
      try {
        await delayedCall(reconnectWebSocket, [], retryDelay);
      } finally {
        instance.reconnectWebSocketPromise = null;
      }
    })();

    await instance.reconnectWebSocketPromise;
  }

  async function reconnectWebSocket() {
    await waitForOnline();
    instance.connectStarted = true;

    // [FIX] Abort if user stopped stream while we were waiting for internet
    if (instance.isManualStop) return;

    const promise = new Promise(async function (resolve) {
      let disconnected = true;
      if (instance.peerConnection) {
        if (
          !['failed', 'disconnected', 'closed'].includes(instance.peerConnection.iceConnectionState)
        ) {
          disconnected = false;
        }
      }
      if (
        Number.isFinite(instance.retryDelay) &&
        Number.isFinite(instance.retryMaxCount) &&
        instance.retriesUsed < instance.retryMaxCount &&
        disconnected
      ) {
        instance.isManualStop = false;
        instance.retriesUsed += 1;
        console.info(`online=${navigator.onLine}. Starting retry attempt ${instance.retriesUsed}`);

        instance.closePeerConnection();
        instance.closeWebSocket();

        instance.error = null;
        instance.webSocketCloseEvent = null;

        try {
          await delayedCall(initWebSocket, [], instance.retryDelay);
        } catch (e) {
        } finally {
          instance.connectStarted = false;
          resolve();
        }
      }
      resolve();
    });

    return promise;
  }

  function initWebSocket() {
    if (!instance.connectionUrl) {
      errorHandler('connectionUrl is required');
      return;
    }

    let webSocket = null;
    try {
      webSocket = new WebSocket(instance.connectionUrl);
    } catch (error) {
      errorHandler(error);
      return;
    }

    instance.webSocket = webSocket;

    webSocket.onopen = function () {
      instance.retriesUsed = 0;
      instance.offerRequestCount = 0;
      requestOffer();
    };

    webSocket.onmessage = async function (e) {
      let message = JSON.parse(e.data);

      if (message.error) {
        console.error('webSocket.onmessage', message.error);
        await addRetryToQueue();
        return;
      }

      if (message.command === 'offer') {
        // OME returns offer. Start create peer connection.
        try {
          await createPeerConnection(
            message.id,
            message.peer_id,
            message.sdp,
            message.candidates,
            message.ice_servers
          );

          instance.offerRequestCount = 0;
          instance.connectStarted = false;
        } catch (e) {
          instance.connectStarted = false;
          console.log('createPeerConnection error', e);

          if (instance.offerRequestCount < 3) {
            requestOffer();
          } else {
            await addRetryToQueue();
          }
        }
      }
    };

    /* For reliability it is recommended to check for error with event code in onclose instead. */
    webSocket.onerror = (e) => console.log('webSocket.onerror', e);

    webSocket.onclose = async function (event) {
      console.log('Connection closed', event);
      instance.webSocketCloseEvent = event;
      // Check if the close was clean (1000) or caused by an issue
      if (event.code !== 1000) {
        await addRetryToQueue();
      } else {
        console.log('Connection closed normally.');
      }
      instance.connectStarted = false;
      if (!instance.isManualStop && instance.callbacks.connectionClosed) {
        try {
          instance.callbacks.connectionClosed('websocket', event);
        } catch (callbackError) {
          console.error(logHeader, 'Error in connectionClosed callback', callbackError);
        }
      }
    };
  }

  function initRetryAfterLongEnoughIceDisconnect(timeout = 3000) {
    if (!instance.iceDisconnectTimeoutId) {
      instance.iceDisconnectTimeoutId = setTimeout(function () {
        if (instance.isManualStop) return;

        if (
          instance.peerConnection &&
          ['failed', 'disconnected'].includes(instance.peerConnection.iceConnectionState)
        ) {
          addRetryToQueue(0);
        }
      }, timeout);
    }
  }

  function cancelRetryAfterLongEnoughIceDisconnect() {
    clearTimeout(instance.iceDisconnectTimeoutId);
    instance.iceDisconnectTimeoutId = null;
  }

  async function createPeerConnection(
    id: number,
    peerId: number,
    offer: Offer,
    candidates: Candidate[],
    iceServers: IceServer[]
  ) {
    console.log({
      id,
      peerId,
      offer,
      candidates,
      iceServers,
    });
    instance.connectionData = {
      id,
      peerId,
    };

    let peerConnectionConfig: RTCConfiguration = {};

    if (instance.connectionConfig.iceServers) {
      // first priority using ice servers from local config.
      peerConnectionConfig.iceServers = instance.connectionConfig.iceServers;

      if (instance.connectionConfig.iceTransportPolicy) {
        peerConnectionConfig.iceTransportPolicy = instance.connectionConfig.iceTransportPolicy;
      }
    } else if (iceServers) {
      // second priority using ice servers from ome and force using TCP
      peerConnectionConfig.iceServers = [];

      for (let i = 0; i < iceServers.length; i++) {
        let iceServer = iceServers[i];
        let regIceServer = {};
        regIceServer.urls = iceServer.urls;
        let hasWebSocketUrl = false;
        let webSocketUrl = generateDomainFromUrl(instance.connectionUrl);

        for (let j = 0; j < regIceServer.urls.length; j++) {
          let serverUrl = regIceServer.urls[j];

          if (serverUrl.indexOf(webSocketUrl) > -1) {
            hasWebSocketUrl = true;
            break;
          }
        }

        if (!hasWebSocketUrl) {
          if (regIceServer.urls.length > 0) {
            let cloneIceServer = regIceServer.urls[0];
            let ip = findIp(cloneIceServer);

            if (webSocketUrl && ip) {
              regIceServer.urls.push(cloneIceServer.replace(ip, webSocketUrl));
            }
          }
        }

        regIceServer.username = iceServer.user_name;
        regIceServer.credential = iceServer.credential;
        peerConnectionConfig.iceServers.push(regIceServer);
      }

      peerConnectionConfig.iceTransportPolicy = 'relay';
    } else {
      // last priority using default ice servers.
      if (instance.iceTransportPolicy) {
        peerConnectionConfig.iceTransportPolicy = instance.iceTransportPolicy;
      }
    }

    console.info(logHeader, 'Create Peer Connection With Config', peerConnectionConfig);

    let peerConnection = new RTCPeerConnection(peerConnectionConfig);
    instance.peerConnection = peerConnection;

    // set local stream
    instance.stream.getTracks().forEach(function (track) {
      console.info(logHeader, 'Add Track To Peer Connection', track);
      peerConnection.addTrack(track, instance.stream);
    });

    if (checkIOSVersion() >= 15) {
      const formatNumber = getFormatNumber(offer.sdp, 'H264');

      if (formatNumber > 0) {
        offer.sdp = removeFormat(offer.sdp, formatNumber);
      }
    }

    if (instance.connectionConfig.maxVideoBitrate) {
      // if bandwith limit is set. modify sdp from ome to limit acceptable bandwidth of ome
      offer.sdp = setBitrateLimit(offer.sdp, 'video', instance.connectionConfig.maxVideoBitrate);
    }

    if (instance.connectionConfig.sdp && instance.connectionConfig.sdp.appendFmtp) {
      offer.sdp = appendFmtp(instance.connectionConfig.sdp.appendFmtp, offer.sdp);
    }

    // Set up event handlers BEFORE setRemoteDescription to avoid missing events
    peerConnection.onicecandidate = function (e) {
      if (e.candidate && e.candidate.candidate) {
        // console.info(logHeader, 'Candidate Sent', '\n', e.candidate.candidate, '\n', e);
        sendMessage(instance.webSocket, {
          id: id,
          peer_id: peerId,
          command: 'candidate',
          candidates: [e.candidate],
        });
      }
    };

    peerConnection.oniceconnectionstatechange = function (e) {
      let state = peerConnection.iceConnectionState;

      console.info(logHeader, 'ICE State', '[' + state + ']');
      instance.iceLastEvent = e;

      if (state === 'failed' && !instance.isManualStop) {
        initRetryAfterLongEnoughIceDisconnect();
      } else if (state === 'disconnected' && !instance.isManualStop) {
        initRetryAfterLongEnoughIceDisconnect();
      } else {
        cancelRetryAfterLongEnoughIceDisconnect();
      }

      if (instance.callbacks.iceStateChange) {
        try {
          instance.callbacks.iceStateChange(state);
        } catch (callbackError) {
          console.error(logHeader, 'Error in iceStateChange callback', callbackError);
        }
      }

      if (state === 'connected') {
        if (instance.callbacks.connected) {
          try {
            instance.callbacks.connected(e);
          } catch (callbackError) {
            console.error(logHeader, 'Error in connected callback', callbackError);
          }
        }
      }

      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (instance.callbacks.connectionClosed) {
          try {
            instance.callbacks.connectionClosed('ice', e);
          } catch (callbackError) {
            console.error(logHeader, 'Error in connectionClosed callback', callbackError);
          }
        }
      }
    };

    peerConnection.onconnectionstatechange = async function (e) {
      let state = peerConnection.connectionState;

      /* A happy ending! */
      if (state === 'connected') {
        instance.error = null;
        instance.webSocketCloseEvent = null;
        instance.reconnectWebSocketPromise = null;
      }
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();

    if (checkIOSVersion() >= 15) {
      const formatNumber = getFormatNumber(answer.sdp, 'H264');

      if (formatNumber > 0) {
        answer.sdp = removeFormat(answer.sdp, formatNumber);
      }
    }

    if (instance.connectionConfig.sdp && instance.connectionConfig.sdp.appendFmtp) {
      answer.sdp = appendFmtp(instance.connectionConfig.sdp.appendFmtp, answer.sdp);
    }

    await peerConnection.setLocalDescription(answer);

    // Add remote ICE candidates after setRemoteDescription completes
    if (candidates) {
      await addIceCandidate(peerConnection, candidates);
    }

    sendMessage(instance.webSocket, {
      id: id,
      peer_id: peerId,
      command: 'answer',
      sdp: answer,
    });
  }

  async function addIceCandidate(peerConnection, candidates) {
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] && candidates[i].candidate) {
        let basicCandidate = candidates[i];

        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(basicCandidate));
        } catch (error) {
          console.error('peerConnection.addIceCandidate', basicCandidate, error);
          errorHandler(error);
        }
      }
    }
  }

  // instance methods
  instance.attachMedia = function (videoElement: HTMLVideoElement) {
    instance.videoElement = videoElement;
  };

  instance.getUserMedia = function (constraints?: MediaStreamConstraints) {
    return getUserMedia(constraints);
  };

  instance.getDisplayMedia = function (constraints?: DisplayMediaStreamConstraints) {
    return getDisplayMedia(constraints);
  };

  instance.switchToCamera = function (deviceId: string) {
    return switchToCamera(deviceId);
  };

  instance.hasActiveConnection = function () {
    return (
      instance.peerConnection &&
      !['closed', 'failed'].includes(instance.peerConnection.connectionState) &&
      !['closed', 'failed'].includes(instance.peerConnection.iceConnectionState)
    );
  };

  instance.startStreaming = function (connectionUrl: string, connectionConfig?: ConnectionConfig) {
    instance.connectionUrl = connectionUrl + '?direction=send&transport=tcp';
    console.info(logEventHeader, 'Start Streaming');

    if (connectionConfig) {
      instance.connectionConfig = connectionConfig;
    }

    instance.retriesUsed = 0;
    instance.isManualStop = false;
    initWebSocket();
  };

  instance.closePeerConnection = function () {
    cancelRetryAfterLongEnoughIceDisconnect();
    // first release peer connection with ome
    if (instance.peerConnection) {
      // remove tracks from peer connection
      instance.peerConnection.getSenders().forEach(function (sender) {
        instance.peerConnection.removeTrack(sender);
      });

      instance.peerConnection.close();
      instance.peerConnection = null;
    }
  };

  instance.closeWebSocket = function () {
    if (instance.webSocket && instance.webSocket.readyState !== WebSocket.CLOSED) {
      // [FIX] Clear callback early to prevent retry trigger in onclose
      instance.webSocket.onclose = null;
      instance.webSocket.onerror = null;
      instance.webSocket.onmessage = null;

      if (instance.connectionData) {
        sendMessage(instance.webSocket, {
          id: instance.connectionData.id,
          peer_id: instance.connectionData.peerId,
          command: 'stop',
        });
      }

      instance.webSocket.close();
      instance.webSocket = null;
    }
  };

  instance.closeVideoAudioStreams = function () {
    if (instance.stream) {
      instance.stream.getTracks().forEach((track) => {
        track.stop();
        instance.stream.removeTrack(track);
      });

      if (instance.videoElement) {
        instance.videoElement.srcObject = null;
      }

      instance.stream = null;
    }
  };

  instance.remove = function () {
    instance.isManualStop = true;
    instance.closePeerConnection();
    instance.closeVideoAudioStreams();
    instance.closeWebSocket();
    console.info(logEventHeader, 'Removed');
  };
}

// static methods
QencodeWebRTC.create = function (config: CreateConfig = {}) {
  console.info('QencodeWebRTC ', '2025-12-22');
  const instance = initConfig(config);
  addMethod(instance);
  return instance;
};

QencodeWebRTC.getDevices = async function (): Promise<Devices> {
  await getStreamForDeviceCheck();
  const deviceInfos = await getDevices();
  return gotDevices(deviceInfos);
};

export default QencodeWebRTC;
