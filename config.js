// Helper to read query params
function getParam(name) {
  var query = location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) === name)
      return decodeURIComponent(pair[1]);
  }
  return null;
}

// Defaults for Gemini
var defaults = {
  base_url: "https://generativelanguage.googleapis.com/v1beta/models/",
  model: "gemini-2.5-flash-lite",
  system_message: "You're running on a Pebble smartwatch. Keep responses short."
};

// Load existing settings from Pebble
var apiKey = getParam('api_key') || "";
var baseUrl = getParam('base_url') || defaults.base_url;
var model = getParam('model') || defaults.model;
var systemMsg = getParam('system_message') || defaults.system_message;

// Pebble return
var returnTo = getParam('return_to') || "pebblejs://close#";

document.addEventListener("DOMContentLoaded", function () {

  document.getElementById("api-key").value = apiKey;
  document.getElementById("base-url").value = baseUrl;
  document.getElementById("model").value = model;
  document.getElementById("system-message").value = systemMsg;

  // Save
  document.getElementById("save-button").addEventListener("click", function () {

    var settings = {
      api_key: document.getElementById("api-key").value.trim(),
      base_url: document.getElementById("base-url").value.trim(),
      model: document.getElementById("model").value.trim(),
      system_message: document.getElementById("system-message").value.trim()
    };

    document.location = returnTo + encodeURIComponent(JSON.stringify(settings));
  });

  // Reset
  document.getElementById("reset-button").addEventListener("click", function () {

    var settings = {
      api_key: "",
      base_url: defaults.base_url,
      model: defaults.model,
      system_message: defaults.system_message
    };

    document.location = returnTo + encodeURIComponent(JSON.stringify(settings));
  });

});
