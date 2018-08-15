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
var signalingURL;

var connections = {}; //{remotePeerId: RTCPeerConnection, ...}
var dataChannels = [];
var signalingChannelReady;
var channel;
var config = {
  "iceServers": [{url: 'stun:23.21.150.121'}, {url: 'stun:stun.l.google.com:19302'}]
};

function initWebRTC(sURL, roomParam) {
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
  //createPeerConnection();
  sendSignalingMessage(["webrtc", room, {"type": "ROOM"}]);
  initiator = false;
}

function onSignalingMessage(message) {
  var msg = JSON.parse(message.data);
  if (msg.type === 'WELCOME') {
    initiator = true;
    msg.remotePeerIds.forEach(function(peerId) {
      if (!connections[peerId]) {
        var pc = createPeerConnection(peerId);
        if (pc)
          doCall(peerId);
      }
    })
    // doCall();
    // printState("do call");
  } else if (msg.type === 'offer') {
    var peerId = msg.fromPeer;
    var pc = connections[peerId];
    if (!pc)
      pc = createPeerConnection(peerId);
    if (pc) {
      pc.setRemoteDescription(new RTCSessionDescription(msg));
      doAnswer(peerId);
      printState("do answer");
    }
  } else if (msg.type === 'answer') {
    var pc = connections[msg.fromPeer];
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    printState("got answer");
  } else if (msg.type === 'candidate') {
    var pc = connections[msg.fromPeer];
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
    //window.location.href = "/";
    printState("Wrong room");
  }
}

function onSignalingChannelClosed() {
  signalingChannelReady = false;
}

function sendSignalingMessage(message) {
  var msgString = JSON.stringify(message);
  channel.send(msgString);
  printState("Sent " + msgString);
}

function createPeerConnection(peerId) {
  try {
    var pc = new RTCPeerConnection(config, null);
    pc.onicecandidate = function(event) {
      if (event.candidate)
        sendSignalingMessage(["webrtc", room, peerId, {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        }]);
    };
    pc.ondatachannel = function(event) {
      console.log('Received data channel creating request');  //calee do
      var dataChannel = event.channel;
      dataChannels.push(dataChannel);
      initDataChannel(dataChannel);
      printState("initDataChannel");

      var checkChannelMessage = {"type": "CHECK_CHANNEL", "uuid": ("" + uuidv4())};
      //send checking message to signaling server,
      // then when other peer will send this uuid also the server will be sure that both ends established channel
      sendSignalingMessage(["webrtc", room, peerId, checkChannelMessage]);
      //send checking message to peer
      sendMessageToPeer(JSON.stringify(checkChannelMessage), dataChannel);
      printState("Checking message sent " + checkChannelMessage.uuid);
    };
    connections[peerId] = pc;

    var s = '';
    for(key in connections)
      s += (key + ' = ' + connections[key] + ';  ');
    printState("connections: " + s);
    return pc;
  } catch (e) {
    console.log(e);
    pc = null;
    return;
  }
}

function initDataChannel(dataChannel) {
  dataChannel.onopen = onChannelStateChange.bind(dataChannel);
  dataChannel.onclose = onChannelStateChange.bind(dataChannel);
  dataChannel.onmessage = onReceiveMessage.bind(dataChannel);
}

function createDataChannel(peerConnection, role) {
  try {
    var dataChannel = peerConnection.createDataChannel("datachannel_" + room + role, null);  //caller do
    dataChannels.push(dataChannel);
  } catch (e) {
    console.log('error creating data channel ' + e);
    return;
  }
  initDataChannel(dataChannel);
}

function failureCallback(e) {
  console.log("failure callback " + e.message);
}

function doCall(toPeer) {
  var peerConnection = connections[toPeer];
  createDataChannel(peerConnection, "caller");
  peerConnection.createOffer(function (offer) {
    peerConnection.setLocalDescription(offer, function() {
      sendSignalingMessage(["webrtc", room, toPeer, peerConnection.localDescription]);
    }, failureCallback);
  }, failureCallback, null);
}

function doAnswer(peerId) {
  var peerConnection = connections[peerId];
  peerConnection.createAnswer(function (answer) {
    peerConnection.setLocalDescription(answer, function() {
      sendSignalingMessage(["webrtc", room, peerId, peerConnection.localDescription]);
    }, failureCallback);
  }, failureCallback);
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  sendSignalingMessage(["webrtc", room, sessionDescription]);
}

function onChannelStateChange() {
  console.log('Data channel state is: ' + this.readyState);
}

function sendMessageToPeer(data, channel) {
  if (channel)
    channel.send(data);
  else
    dataChannels.forEach(function(channel) {channel.send(data);});
}

function onReceiveMessage(event) {
  console.log(event);
  try {
    var msg = JSON.parse(event.data);
    if (msg.type === 'chatmessage') {
      onPrivateMessageReceived(msg.txt);
    } else if (msg.type === 'CHECK_CHANNEL') {
      sendSignalingMessage(["webrtc", room, msg]);
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
