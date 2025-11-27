/* PKJS Gemini Client - ES5 Compatible */

var READY_STATUS_KEY = 0;
var RESPONSE_TEXT_KEY = 1;
var RESPONSE_END_KEY = 2;
var REQUEST_CHAT_KEY = 3;

/* --------------------- PARSE CHAT --------------------- */
function parseConversation(encoded) {
  var messages = [];
  var split = encoded.split(/(\[U\]|\[A\])/);
  var role = null;

  for (var i = 0; i < split.length; i++) {
    if (split[i] === "[U]") {
      role = "user";
    } else if (split[i] === "[A]") {
      role = "assistant";
    } else if (split[i] && role) {
      messages.push({ role: role, content: split[i] });
      role = null;
    }
  }
  return messages;
}

/* --------------------- GEMINI REQUEST --------------------- */
function getGeminiResponse(messages) {

  var apiKey = localStorage.getItem("api_key");
  var baseUrl = localStorage.getItem("base_url") ||
                "https://generativelanguage.googleapis.com/v1beta/models/";
  var model = localStorage.getItem("model") || "gemini-1.5-flash";
  var systemMessage = localStorage.getItem("system_message") || "";

  if (!apiKey) {
    Pebble.sendAppMessage({ RESPONSE_TEXT: "API key missing." });
    Pebble.sendAppMessage({ RESPONSE_END: 1 });
    return;
  }

  var contents = [];

  if (systemMessage && systemMessage.trim() !== "") {
    contents.push({
      role: "system",
      parts: [{ text: systemMessage }]
    });
  }

  for (var i = 0; i < messages.length; i++) {
    contents.push({
      role: messages[i].role,
      parts: [{ text: messages[i].content }]
    });
  }

  var url = baseUrl + model + ":generateContent?key=" + encodeURIComponent(apiKey);

  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.timeout = 15000;

  xhr.onload = function () {
    var responseText = "No response";

    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);

        if (data &&
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text) {

          responseText = data.candidates[0].content.parts[0].text;
        }

      } catch (e) {
        responseText = "Error parsing Gemini output";
      }
    } else {
      responseText = "Error " + xhr.status;
    }

    Pebble.sendAppMessage({ RESPONSE_TEXT: responseText });
    Pebble.sendAppMessage({ RESPONSE_END: 1 });
  };

  xhr.onerror = function () {
    Pebble.sendAppMessage({ RESPONSE_TEXT: "Network error" });
    Pebble.sendAppMessage({ RESPONSE_END: 1 });
  };

  xhr.ontimeout = function () {
    Pebble.sendAppMessage({ RESPONSE_TEXT: "Timeout" });
    Pebble.sendAppMessage({ RESPONSE_END: 1 });
  };

  xhr.send(JSON.stringify({ contents: contents }));
}

/* --------------------- READY STATUS --------------------- */
function updateReadyStatus() {
  var apiKey = localStorage.getItem("api_key");
  var ready = (apiKey && apiKey.trim() !== "") ? 1 : 0;

  Pebble.sendAppMessage({ READY_STATUS: ready });
}

/* --------------------- PEBBLE EVENT HANDLERS --------------------- */

Pebble.addEventListener("ready", function () {
  updateReadyStatus();
});

Pebble.addEventListener("appmessage", function (e) {
  if (e.payload && e.payload.REQUEST_CHAT) {
    var msgs = parseConversation(e.payload.REQUEST_CHAT);
    getGeminiResponse(msgs);
  }
});

Pebble.addEventListener("showConfiguration", function () {

  var apiKey = localStorage.getItem("api_key") || "";
  var baseUrl = localStorage.getItem("base_url") || "";
  var model = localStorage.getItem("model") || "";
  var systemMessage = localStorage.getItem("system_message") || "";

  var url =
    "https://dinosan-kinde.github.io/client-for-pebble/index.html" +
    "?api_key=" + encodeURIComponent(apiKey) +
    "&base_url=" + encodeURIComponent(baseUrl) +
    "&model=" + encodeURIComponent(model) +
    "&system_message=" + encodeURIComponent(systemMessage);

  Pebble.openURL(url);
});

Pebble.addEventListener("webviewclosed", function (e) {
  if (!e || !e.response) return;

  var settings = JSON.parse(decodeURIComponent(e.response));

  for (var key in settings) {
    if (settings[key] && settings[key].trim() !== "") {
      localStorage.setItem(key, settings[key]);
    } else {
      localStorage.removeItem(key);
    }
  }

  updateReadyStatus();
});
