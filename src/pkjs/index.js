var MESSAGE_KEYS = { 
  KEY_QUESTION: 0, 
  KEY_RESPONSE: 1, 
  KEY_ERROR: 2 
};

// Load settings from localStorage
function loadSettings() {
  try {
    var stored = localStorage.getItem('settings');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.log('Error loading settings: ' + e);
    return {};
  }
}

// Save settings to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem('settings', JSON.stringify(settings));
  } catch (e) {
    console.log('Error saving settings: ' + e);
  }
}

var config = loadSettings();

function send(key, text) {
  var dict = {};
  dict[key] = text.substring(0, 500); // safety truncation
  Pebble.sendAppMessage(dict);
}

function truncate(text, maxLength) {
  maxLength = maxLength || 480;
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

// Query Claude (Anthropic)
function queryClaude(question) {
  var apiKey = config.api_key;
  var baseUrl = config.base_url || 'https://api.anthropic.com/v1/messages';
  var model = config.model || 'claude-haiku-4-5';
  var systemMessage = config.system_message || "You're running on a Pebble smartwatch. Please respond in plain text without any formatting, keeping your responses within 1-3 sentences.";
  var webSearchEnabled = config.web_search_enabled === 'true';

  var requestBody = {
    model: model,
    max_tokens: 300,
    system: systemMessage,
    messages: [{ 
      role: "user", 
      content: question 
    }]
  };

  // Add web search tool if enabled
  if (webSearchEnabled) {
    requestBody.tools = [{
      type: "web_search_20250305",
      name: "web_search"
    }];
  }

  var xhr = new XMLHttpRequest();
  xhr.open('POST', baseUrl, true);
  xhr.setRequestHeader('x-api-key', apiKey);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var text = data.content && data.content[0] && data.content[0].text 
          ? data.content[0].text 
          : "No response";
        send(MESSAGE_KEYS.KEY_RESPONSE, truncate(text));
      } catch (e) {
        send(MESSAGE_KEYS.KEY_ERROR, 'Parse error');
      }
    } else {
      send(MESSAGE_KEYS.KEY_ERROR, 'Claude error ' + xhr.status);
    }
  };
  
  xhr.onerror = function() {
    send(MESSAGE_KEYS.KEY_ERROR, 'Network error');
  };
  
  xhr.send(JSON.stringify(requestBody));
}

// Query OpenAI (ChatGPT)
function queryOpenAI(question) {
  var apiKey = config.api_key;
  var baseUrl = config.base_url || 'https://api.openai.com/v1/chat/completions';
  var model = config.model || 'gpt-4o-mini';
  var systemMessage = config.system_message || "You're running on a Pebble smartwatch. Keep responses very brief - 1-3 sentences maximum.";

  var requestBody = {
    model: model,
    max_tokens: 300,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: question }
    ]
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', baseUrl, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
          ? data.choices[0].message.content
          : "No response";
        send(MESSAGE_KEYS.KEY_RESPONSE, truncate(text));
      } catch (e) {
        send(MESSAGE_KEYS.KEY_ERROR, 'Parse error');
      }
    } else {
      send(MESSAGE_KEYS.KEY_ERROR, 'OpenAI error ' + xhr.status);
    }
  };
  
  xhr.onerror = function() {
    send(MESSAGE_KEYS.KEY_ERROR, 'Network error');
  };
  
  xhr.send(JSON.stringify(requestBody));
}

// Query Google Gemini
function queryGemini(question) {
  var apiKey = config.api_key;
  var model = config.model || 'gemini-1.5-flash';
  var systemMessage = config.system_message || "You're running on a Pebble smartwatch. Keep responses extremely brief - 1-3 sentences only.";
  
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

  var requestBody = {
    system_instruction: { parts: [{ text: systemMessage }] },
    contents: [{ 
      parts: [{ text: question }]
    }],
    generationConfig: {
      maxOutputTokens: 300
    }
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && 
                   data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
                   data.candidates[0].content.parts[0].text
          ? data.candidates[0].content.parts[0].text
          : "No response";
        send(MESSAGE_KEYS.KEY_RESPONSE, truncate(text));
      } catch (e) {
        send(MESSAGE_KEYS.KEY_ERROR, 'Parse error');
      }
    } else {
      send(MESSAGE_KEYS.KEY_ERROR, 'Gemini error ' + xhr.status);
    }
  };
  
  xhr.onerror = function() {
    send(MESSAGE_KEYS.KEY_ERROR, 'Network error');
  };
  
  xhr.send(JSON.stringify(requestBody));
}

// Query Grok (xAI)
function queryGrok(question) {
  var apiKey = config.api_key;
  var baseUrl = config.base_url || 'https://api.x.ai/v1/chat/completions';
  var model = config.model || 'grok-2-latest';
  var systemMessage = config.system_message || "You're running on a Pebble smartwatch. Keep responses brief - 1-3 sentences.";

  var requestBody = {
    model: model,
    max_tokens: 300,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: question }
    ]
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', baseUrl, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
          ? data.choices[0].message.content
          : "No response";
        send(MESSAGE_KEYS.KEY_RESPONSE, truncate(text));
      } catch (e) {
        send(MESSAGE_KEYS.KEY_ERROR, 'Parse error');
      }
    } else {
      send(MESSAGE_KEYS.KEY_ERROR, 'Grok error ' + xhr.status);
    }
  };
  
  xhr.onerror = function() {
    send(MESSAGE_KEYS.KEY_ERROR, 'Network error');
  };
  
  xhr.send(JSON.stringify(requestBody));
}

// Route to appropriate provider
function queryAI(question) {
  var provider = config.provider || 'claude';
  
  if (!config.api_key) {
    send(MESSAGE_KEYS.KEY_ERROR, 'No API key set');
    return;
  }
  
  switch(provider) {
    case 'claude':
      queryClaude(question);
      break;
    case 'openai':
      queryOpenAI(question);
      break;
    case 'gemini':
      queryGemini(question);
      break;
    case 'grok':
      queryGrok(question);
      break;
    default:
      send(MESSAGE_KEYS.KEY_ERROR, 'Unknown provider');
  }
}

// Handle app ready event
Pebble.addEventListener('ready', function() {
  console.log('PebbleKit JS ready!');
  config = loadSettings();
  
  if (config.api_key) {
    var providerName = config.provider || 'Claude';
    send(MESSAGE_KEYS.KEY_RESPONSE, 'Ready with ' + providerName + '!');
  } else {
    send(MESSAGE_KEYS.KEY_RESPONSE, 'Open settings to configure');
  }
});

// Handle incoming messages from watch
Pebble.addEventListener('appmessage', function(e) {
  console.log('Received message: ' + JSON.stringify(e.payload));
  
  if (e.payload && e.payload.KEY_QUESTION) {
    config = loadSettings(); // Reload settings in case they changed
    var question = e.payload.KEY_QUESTION;
    queryAI(question);
  }
});

// Handle settings page
Pebble.addEventListener('showConfiguration', function() {
  console.log('Showing configuration');
  
  // Your GitHub Pages URL
  var url = 'https://dinosan-kinde.github.io/client-for-pebble/index.html';
  
  // Add current settings as query parameters
  var params = [];
  if (config.provider) params.push('provider=' + encodeURIComponent(config.provider));
  if (config.api_key) params.push('api_key=' + encodeURIComponent(config.api_key));
  if (config.base_url) params.push('base_url=' + encodeURIComponent(config.base_url));
  if (config.model) params.push('model=' + encodeURIComponent(config.model));
  if (config.system_message) params.push('system_message=' + encodeURIComponent(config.system_message));
  if (config.web_search_enabled) params.push('web_search_enabled=' + encodeURIComponent(config.web_search_enabled));
  if (config.mcp_servers) params.push('mcp_servers=' + encodeURIComponent(config.mcp_servers));
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  Pebble.openURL(url);
});

// Handle settings closure
Pebble.addEventListener('webviewclosed', function(e) {
  console.log('Configuration closed');
  
  if (e && e.response) {
    try {
      var settings = JSON.parse(decodeURIComponent(e.response));
      console.log('Received settings: ' + JSON.stringify(settings));
      
      // Save settings
      config = settings;
      saveSettings(settings);
      
      // Notify watch
      if (settings.api_key) {
        var providerName = settings.provider || 'AI';
        send(MESSAGE_KEYS.KEY_RESPONSE, 'Saved! Using ' + providerName);
      } else {
        send(MESSAGE_KEYS.KEY_RESPONSE, 'Settings cleared');
      }
    } catch (err) {
      console.log('Error parsing settings: ' + err);
      send(MESSAGE_KEYS.KEY_ERROR, 'Settings error');
    }
  }
});
