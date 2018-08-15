/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */

var room = null;
var initiator;
var pc = null;
var signalingURL;

var dataChannels = [];
var signalingChannelReady;
var channel;
var pc_config = {
  "iceServers": [{url: 'stun:23.21.150.121'}, {url: 'stun:stun.l.google.com:19302'}]
};

function init(sURL, roomParam) {
  signalingURL = sURL;
  room = roomParam;
  openSignalingChannel();
}

function openSignalingChannel() {
  signalingChannelReady = false;
  channel = new WebSocket(signalingURL);
  channel.onopen = onSignalingChannelOpened;
  channel.onmessage = onSignalingMessage;
  channel.onclose = onSignalingChannelClosed;
}

function onSignalingChannelOpened() {
  signalingChannelReady = true;
  createPeerConnection();
  sendMessageToSignalingServer(["webrtc", room, {"type": "ROOM"}]);
  initiator = false;
}

function onSignalingChannelClosed() {
  signalingChannelReady = false;
}

function onSignalingMessage(message) {
  var msg = JSON.parse(message.data);
  if (msg.type === 'WELCOME') {
    initiator = true;
    doCall();
    printState("do call");
  } else if (msg.type === 'offer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
    printState("do answer");
  } else if (msg.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    printState("got answer");
  } else if (msg.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate
    });
    pc.addIceCandidate(candidate);
    printState("addIceCandidate");
  } else if (msg.type === 'GETROOM') {
    room = msg.value;
    onRoomReceived(room);
    printState("Room received");
  } else if (msg.type === 'WRONGROOM') {
    printState("Wrong room");
  }
}

function sendMessageToSignalingServer(message) {
  var msgString = JSON.stringify(message);
  channel.send(msgString);
  printState("Sent " + msgString);
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pc_config, null);
    pc.onicecandidate = onIceCandidate;
    pc.ondatachannel = onDataChannel;
  } catch (e) {
    console.log(e);
    pc = null;
    return;
  }
}

function onDataChannel(evt) {
  console.log('Received data channel creating request');  //calee do
  dataChannel = evt.channel;
  dataChannels.push(dataChannel);
  initDataChannel(dataChannel);
  printState("initDataChannel");

  let checkChannelMessage = {"type": "CHECK_CHANNEL", "uuid": ("" + uuidv4())};
  //send checking message to signaling server,
  // then when other peer will send this uuid also the server will be sure that both ends established channel
  sendMessageToSignalingServer(["webrtc", room, checkChannelMessage]);
  //send checking message to peer
  sendMessageToPeer(JSON.stringify(checkChannelMessage));
  printState("Checking message sent " + checkChannelMessage.uuid);
}

function initDataChannel(dataChannel) {
  dataChannel.onopen = onChannelStateChange.bind(dataChannel);
  dataChannel.onclose = onChannelStateChange.bind(dataChannel);
  dataChannel.onmessage = onReceiveMessage.bind(dataChannel);
}

function createDataChannel(role) {
  try {
    dataChannel = pc.createDataChannel("datachannel_" + room + role, null);  //caller do
    dataChannels.push(dataChannel);
  } catch (e) {
    console.log('error creating data channel ' + e);
    return;
  }
  initDataChannel(dataChannel);
}

function onIceCandidate(event) {
  if (event.candidate && !event.candidate.candidate.includes("91.243.236.23"))
    sendMessageToSignalingServer(["webrtc", room, {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }]);
}

function failureCallback(e) {
  console.log("failure callback " + e.message);
}

function doCall() {
  createDataChannel("caller");
  pc.createOffer(setLocalAndSendMessage, failureCallback, null);
}

function doAnswer() {
  pc.createAnswer(setLocalAndSendMessage, failureCallback, null);
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  //sessionDescription.room = room * 1;
  sendMessageToSignalingServer(["webrtc", room, sessionDescription]);
}

function onChannelStateChange() {
  console.log('Data channel state is: ' + this.readyState);
}

function sendMessageToPeer(data) {
  dataChannel.send(data);
}

function onReceiveMessage(event) {
  console.log(event);
  try {
    var msg = JSON.parse(event.data);
    if (msg.type === 'chatmessage') {
      onPrivateMessageReceived(msg.txt);
    } else if (msg.type === 'CHECK_CHANNEL') {
      sendMessageToSignalingServer(["webrtc", room, msg]);
      printState("Checking message received (then sent to signaling server) " + msg.uuid);
    }
  } catch (e) {
    console.log(e);
  }
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c=>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
)
}
