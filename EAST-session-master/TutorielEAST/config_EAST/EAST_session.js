// pour jslint
var EVENTS = EVENTS || {};
var console = console || {};
var unescape = unescape || {};

(function(){

// public API
  document.SESSION = {};

// session events list
  var sessionEvents = [];
// absolute time of last event
  var sessionLastEventTime = (new Date()).getTime();
// are we recording or playing a session ?
  var sessionIsRecording = true;
//
  var slideControlContainer = null;
// counter for elsommaire2 elements
  var id_cpt = 100;

// adds an event to the session events list
  var pushEvent = function(event, id){
    var eventTime = (new Date()).getTime();
    var interval = eventTime - sessionLastEventTime;
    sessionLastEventTime = eventTime;

    // do not catch show or reset event happening after slide event
    if (sessionEvents[sessionEvents.length-1].type !== 'slide' ||
        (event !== 'show' && event !== 'reset')) {
      sessionEvents.push({
        type: event,
        id: id,
        time: interval
      });
    }
  };
//lecteur audio

  "use strict";
  function byId(e){return document.getElementById(e);}

  window.addEventListener('load', onDocLoaded, false);

  function onDocLoaded()
  {
    byId('mFileInput').addEventListener('change', onChosenFileChange, false);
  }

  function onChosenFileChange(evt)
  {
    var fileType = this.files[0].type;

    if (fileType.indexOf('audio') != -1)
      loadFileObject(this.files[0], onSoundLoaded);

    else if (fileType.indexOf('image') != -1)
      loadFileObject(this.files[0], onImageLoaded);

    else if (fileType.indexOf('video') != -1)
      loadFileObject(this.files[0], onVideoLoaded);
  }

  function loadFileObject(fileObj, loadedCallback)
  {
    var reader = new FileReader();
    reader.onload = loadedCallback;
    reader.readAsDataURL( fileObj );
  }

  function onSoundLoaded(evt)
  {
    byId('sound').src = evt.target.result;
    byId('sound').play();
    playSession();

  }

  function onImageLoaded(evt)
  {
    byId('image').src = evt.target.result;
  }

  function onVideoLoaded(evt)
  {
    byId('video').src = evt.target.result;
    byId('video').play();
  }
// === Events functions
  var new_selectIndex = function(){
    // arguments[0] is the index number
    if (sessionIsRecording){
      pushEvent('slide', arguments[0]);
    }
    return this.org_selectIndex.apply(this, arguments);
  };
  var new_slide_reset = function(){
    if (sessionIsRecording){
      pushEvent('reset');
    }
    return this.org_reset.apply(this, arguments);
  };
  var new_slide_show = function(){
    if (sessionIsRecording){
      pushEvent('show');
    }
    return this.org_show.apply(this, arguments);
  };
  var new_slide_click = function(e){
    if (sessionIsRecording){
      pushEvent('click');
    }
  };
  var new_li_click = function(id, e){
    if (sessionIsRecording){
      pushEvent('li', id);
    }
  };
// ===

// Adds an id to title elements if necessary
  var checkID = function(node){
    if (!node.hasAttribute('id')) {
      node.id = 'el'+(id_cpt++);
    }
    return node.id;
  };

// Converts session events array to XML
  var sessionEventsToXml = function(){
    var doc = document.implementation.createDocument("", "", null);
    doc.appendChild(doc.createComment("SMIL session file"));
    doc.appendChild(doc.createComment("Open your presentation, click \"Load session\" button and select this file."));
    doc.appendChild(doc.createElement('xml'));
    doc.lastChild.appendChild(doc.createTextNode('\n'));
    for (var _e=0; _e<sessionEvents.length; _e+=1) {
      var e = doc.createElement('event');
      e.setAttribute('type', sessionEvents[_e].type);
      e.setAttribute('id', sessionEvents[_e].id);
      e.setAttribute('time', sessionEvents[_e].time);
      doc.lastChild.appendChild(e);
      doc.lastChild.appendChild(doc.createTextNode('\n'));
    }
    return (new XMLSerializer()).serializeToString(doc);
  };

  var xmlToSessionEvents = function(xml){
    var doc = (new DOMParser()).parseFromString(xml, "application/xml");
    var events = doc.getElementsByTagName('event');
    var session = [];
    for (var _e=0; _e<events.length; _e+=1) {
      session.push({
        type: events[_e].getAttribute('type'),
        id: events[_e].getAttribute('id'),
        time: events[_e].getAttribute('time')
      });
    }
    return session;
  };

  var playSession = function(){
    var position = 0;
    var lastTimeout;

    var walkSession = function(){
      switch (sessionEvents[position].type){
        case 'slide':
          slideControlContainer.selectIndex(parseInt(sessionEvents[position].id, 10));
          break;
        case 'reset':
          document.getTimeContainersByTarget(document.getElementById(window.location.hash.slice(1)))[0].reset();
          break;
        case 'show':
          document.getTimeContainersByTarget(document.getElementById(window.location.hash.slice(1)))[0].show();
          break;
        case 'click':
          document.getElementById(window.location.hash.slice(1)).click();
          break;
        case 'li':
          document.getElementById(sessionEvents[position].id).click();
          break;
      }
      position += 1;
      if (position < sessionEvents.length){
        lastTimeout = window.setTimeout(walkSession, sessionEvents[position].time);
      }
    };

    sessionIsRecording = false;
    walkSession();
  };

  document.SESSION.record = function(){
    sessionEvents = [{
      type: 'slide',
      id: slideControlContainer.currentIndex,
      time: 0
    }];
    sessionLastEventTime = (new Date()).getTime();
    sessionIsRecording = true;
  };

  EVENTS.onSMILReady(function() {
    var containers = document.getTimeContainersByTagName("*");
    slideControlContainer = containers[containers.length-1];
    for (var _i=0; _i<containers.length; _i+=1) {
      var navigation = containers[_i].parseAttribute("navigation");
      if (navigation) {
        // overrides selectIndex for each slide
        containers[_i].org_selectIndex = containers[_i].selectIndex;
        containers[_i].selectIndex = new_selectIndex;

        for (var _j=0; _j<containers[_i].timeNodes.length; _j+=1) {
          var slide = containers[_i].timeNodes[_j];
          // overrides slide.reset()
          slide.org_reset = slide.reset;
          slide.reset = new_slide_reset;
          // overrides slide.show()
          slide.org_show = slide.show;
          slide.show = new_slide_show;
          // intercepts slide click
          EVENTS.bind(slide.target, "click", new_slide_click);
        }
      }
    }
    // intercepts click on list
    var liTab = document.getElementsByTagName("li");
    for (_i=0; _i<liTab.length; _i+=1) {
      if (liTab[_i].hasAttribute("smil")){
        liTab[_i].addEventListener("click", new_li_click.bind(null, checkID(liTab[_i])));
      }
    }

    // add buttons in navbar

    var recbtn = document.createElement('button');
    var exportbtn = document.createElement('button');
    var fileInput = document.createElement('input');
    recbtn.setAttribute('id', 'session_rec');
    recbtn.title = 'Start session recording';
    recbtn.appendChild(document.createTextNode('Record session'));
    exportbtn.id = 'session_export'; exportbtn.title = 'Export session';
    exportbtn.appendChild(document.createTextNode('Export session'));
    fileInput.type = 'file'; fileInput.id = 'session_import'; fileInput.title = 'Import session';

    recbtn.addEventListener('click', document.SESSION.record);

    exportbtn.addEventListener('click', function(){
      window.open('data:plain/xml;base64,' +
          window.btoa(unescape(
              encodeURIComponent(sessionEventsToXml())
          )));
    });

    fileInput.addEventListener('change', function(e){
      var file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = function(f){
        sessionEvents = xmlToSessionEvents(f.target.result);
      };
      reader.readAsText(file);
    });



    var start = document.createElement('button');
    var startRecordingButton = document.createElement('button');
    var stopRecordingButton = document.createElement('button');
    var playButton = document.createElement('button');
    var downloadButton = document.createElement('button');

    start.title="commencer sans audio";
    startRecordingButton.title = 'Start audio recording';
    stopRecordingButton.title = 'Stop audio recording';
    playButton.title = 'Start session audio';
    downloadButton.title = 'dL audio';

    start.appendChild(document.createTextNode('Start presentation'));
    startRecordingButton.appendChild(document.createTextNode('Rec Audio'));
    stopRecordingButton.appendChild(document.createTextNode('Stop record'));
    playButton.appendChild(document.createTextNode('test audio'));
    downloadButton.appendChild(document.createTextNode('dL Audio'));
    var leftchannel = [];
    var rightchannel = [];
    var recorder = null;
    var recordingLength = 0;
    var volume = null;
    var mediaStream = null;
    var sampleRate = 44100;
    var context = null;
    var blob = null;
    startRecordingButton.addEventListener("click", function () {
      // Initialize recorder
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      navigator.getUserMedia(
          {
            audio: true
          },
          function (e) {
            console.log("user consent");
            // creates the audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext();
            // creates an audio node from the microphone incoming stream
            mediaStream = context.createMediaStreamSource(e);
            // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
            // bufferSize: the onaudioprocess event is called when the buffer is full
            var bufferSize = 2048;
            var numberOfInputChannels = 2;
            var numberOfOutputChannels = 2;
            if (context.createScriptProcessor) {
              recorder = context.createScriptProcessor(bufferSize, numberOfInputChannels, numberOfOutputChannels);
            } else {
              recorder = context.createJavaScriptNode(bufferSize, numberOfInputChannels, numberOfOutputChannels);
            }
            recorder.onaudioprocess = function (e) {
              leftchannel.push(new Float32Array(e.inputBuffer.getChannelData(0)));
              rightchannel.push(new Float32Array(e.inputBuffer.getChannelData(1)));
              recordingLength += bufferSize;
            }
            // we connect the recorder
            mediaStream.connect(recorder);
            recorder.connect(context.destination);
          },
          function (e) {
            console.error(e);
          });
    });
    stopRecordingButton.addEventListener("click", function () {
      // stop recording
      recorder.disconnect(context.destination);
      mediaStream.disconnect(recorder);
      // we flat the left and right channels down
      // Float32Array[] => Float32Array
      var leftBuffer = flattenArray(leftchannel, recordingLength);
      var rightBuffer = flattenArray(rightchannel, recordingLength);
      // we interleave both channels together
      // [left[0],right[0],left[1],right[1],...]
      var interleaved = interleave(leftBuffer, rightBuffer);
      // we create our wav file
      var buffer = new ArrayBuffer(44 + interleaved.length * 2);
      var view = new DataView(buffer);
      // RIFF chunk descriptor
      writeUTFBytes(view, 0, 'RIFF');
      view.setUint32(4, 44 + interleaved.length * 2, true);
      writeUTFBytes(view, 8, 'WAVE');
      // FMT sub-chunk
      writeUTFBytes(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // chunkSize
      view.setUint16(20, 1, true); // wFormatTag
      view.setUint16(22, 2, true); // wChannels: stereo (2 channels)
      view.setUint32(24, sampleRate, true); // dwSamplesPerSec
      view.setUint32(28, sampleRate * 4, true); // dwAvgBytesPerSec
      view.setUint16(32, 4, true); // wBlockAlign
      view.setUint16(34, 16, true); // wBitsPerSample
      // data sub-chunk
      writeUTFBytes(view, 36, 'data');
      view.setUint32(40, interleaved.length * 2, true);
      // write the PCM samples
      var index = 44;
      var volume = 1;
      for (var i = 0; i < interleaved.length; i++) {
        view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
        index += 2;
      }
      // our final blob
      blob = new Blob([view], { type: 'audio/wav' });
    });
    playButton.addEventListener("click", function () {
      if (blob == null) {
        return;
      }
      var url = window.URL.createObjectURL(blob);
      var audio = new Audio(url);
      audio.play();
    });
    downloadButton.addEventListener("click", function () {
      if (blob == null) {
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "sample.wav";
      a.click();
      window.URL.revokeObjectURL(url);
    });
    function flattenArray(channelBuffer, recordingLength) {
      var result = new Float32Array(recordingLength);
      var offset = 0;
      for (var i = 0; i < channelBuffer.length; i++) {
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
      }
      return result;
    }
    function interleave(leftChannel, rightChannel) {
      var length = leftChannel.length + rightChannel.length;
      var result = new Float32Array(length);
      var inputIndex = 0;
      for (var index = 0; index < length;) {
        result[index++] = leftChannel[inputIndex];
        result[index++] = rightChannel[inputIndex];
        inputIndex++;
      }
      return result;
    }
    function writeUTFBytes(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    //Jouer encemble la presentation et le son de la presentation




    start.addEventListener("click", function(){
      playSession();

    });

    document.getElementById('navigation_par').appendChild(start);
    document.getElementById('navigation_par').appendChild(recbtn);
    document.getElementById('navigation_par').appendChild(exportbtn);
    document.getElementById('navigation_par').appendChild(fileInput);
    document.getElementById('navigation_par').appendChild(startRecordingButton);
    document.getElementById('navigation_par').appendChild(stopRecordingButton);
    document.getElementById('navigation_par').appendChild(playButton);
    document.getElementById('navigation_par').appendChild(downloadButton);

    document.SESSION.record();
  });



})();
