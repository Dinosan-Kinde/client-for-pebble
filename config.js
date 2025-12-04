// Get query parameters
function getQueryParam(param) {
  var query = location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == param) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}

// Provider configurations
var providerConfigs = {
  claude: {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5',
    models: [
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Balanced)' },
      { value: 'claude-opus-4', label: 'Claude Opus 4 (Best)' }
    ],
    systemMessage: "You're running on a Pebble smartwatch. Please respond in plain text without any formatting, keeping your responses within 1-3 sentences.",
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelp: 'Get your API key from console.anthropic.com',
    supportsWebSearch: true
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
      { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    systemMessage: "You're running on a Pebble smartwatch. Keep responses very brief - 1-3 sentences maximum.",
    apiKeyPlaceholder: 'sk-proj-...',
    apiKeyHelp: 'Get your API key from platform.openai.com/api-keys',
    supportsWebSearch: false
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash-lite',
    models: [
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash (Lite)' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.5 Flash (Lite)' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
    ],
    systemMessage: "You're running on a Pebble smartwatch. Keep responses extremely brief - 1-3 sentences only.",
    apiKeyPlaceholder: 'AIza...',
    apiKeyHelp: 'Get your API key from ai.google.dev',
    supportsWebSearch: false
  },
  grok: {
    name: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-2-latest',
    models: [
      { value: 'grok-2-latest', label: 'Grok 2 (Latest)' },
      { value: 'grok-2-1212', label: 'Grok 2 (December 2024)' },
      { value: 'grok-beta', label: 'Grok Beta' }
    ],
    systemMessage: "You're running on a Pebble smartwatch. Keep responses brief - 1-3 sentences.",
    apiKeyPlaceholder: 'xai-...',
    apiKeyHelp: 'Get your API key from console.x.ai',
    supportsWebSearch: false
  }
};

// Default values
var defaults = {
  provider: 'claude',
  base_url: providerConfigs.claude.baseUrl,
  model: providerConfigs.claude.defaultModel,
  system_message: providerConfigs.claude.systemMessage
};

// Load existing settings
var provider = getQueryParam('provider') || defaults.provider;
var apiKey = getQueryParam('api_key');
var baseUrl = getQueryParam('base_url');
var model = getQueryParam('model');
var systemMessage = getQueryParam('system_message');
var webSearchEnabled = getQueryParam('web_search_enabled');
var mcpServers = getQueryParam('mcp_servers');

// Get return_to for emulator support
var returnTo = getQueryParam('return_to') || 'pebblejs://close#';

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  var providerSelect = document.getElementById('provider');
  var apiKeyInput = document.getElementById('api-key');
  var apiKeyHelp = document.getElementById('api-key-help');
  var baseUrlInput = document.getElementById('base-url');
  var modelSelect = document.getElementById('model');
  var systemMessageInput = document.getElementById('system-message');
  var webSearchCheckbox = document.getElementById('web-search');
  var advancedRows = document.querySelectorAll('.advanced-field');

  // Function to update form based on selected provider
  function updateProviderFields() {
    var selectedProvider = providerSelect.value;
    var config = providerConfigs[selectedProvider];

    // Update API key placeholder and help text
    apiKeyInput.placeholder = config.apiKeyPlaceholder;
    apiKeyHelp.textContent = config.apiKeyHelp;

    // Update base URL
    baseUrlInput.value = config.baseUrl;

    // Update model dropdown
    modelSelect.innerHTML = '';
    config.models.forEach(function(modelOption) {
      var option = document.createElement('option');
      option.value = modelOption.value;
      option.textContent = modelOption.label;
      modelSelect.appendChild(option);
    });
    modelSelect.value = config.defaultModel;

    // Update system message
    if (!systemMessageInput.value || systemMessageInput.value === providerConfigs[provider].systemMessage) {
      systemMessageInput.value = config.systemMessage;
    }

    // Show/hide web search based on provider support
    var webSearchRow = webSearchCheckbox.closest('tr');
    if (config.supportsWebSearch) {
      webSearchRow.style.display = '';
    } else {
      webSearchRow.style.display = 'none';
      webSearchCheckbox.checked = false;
    }
  }

  // Set initial form values
  providerSelect.value = provider;
  updateProviderFields();

  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  if (baseUrl) {
    baseUrlInput.value = baseUrl;
  }
  if (model) {
    modelSelect.value = model;
  }
  if (systemMessage) {
    systemMessageInput.value = systemMessage;
  }
  webSearchCheckbox.checked = webSearchEnabled === 'true';
  if (mcpServers) {
    document.getElementById('mcp-servers').value = mcpServers;
  }

  // Function to toggle advanced fields visibility
  function toggleAdvancedFields() {
    var hasApiKey = apiKeyInput.value.trim() !== '';
    advancedRows.forEach(function (row) {
      row.style.display = hasApiKey ? '' : 'none';
    });
    
    // Re-apply web search visibility based on provider
    if (hasApiKey) {
      updateProviderFields();
    }
  }

  // Initial visibility check
  toggleAdvancedFields();

  // Listen for provider changes
  providerSelect.addEventListener('change', function() {
    updateProviderFields();
  });

  // Listen for API key changes
  apiKeyInput.addEventListener('input', toggleAdvancedFields);

  // Save button handler
  document.getElementById('save-button').addEventListener('click', function () {
    var mcpServersValue = document.getElementById('mcp-servers').value.trim();

    // Validate MCP servers JSON if provided
    if (mcpServersValue) {
      try {
        var parsed = JSON.parse(mcpServersValue);
        if (!Array.isArray(parsed)) {
          alert('MCP Servers must be a JSON array');
          return;
        }
      } catch (e) {
        alert('Invalid JSON in MCP Servers field: ' + e.message);
        return;
      }
    }

    var settings = {
      provider: providerSelect.value,
      api_key: apiKeyInput.value.trim(),
      base_url: baseUrlInput.value.trim(),
      model: modelSelect.value.trim(),
      system_message: systemMessageInput.value.trim(),
      web_search_enabled: webSearchCheckbox.checked.toString(),
      mcp_servers: mcpServersValue
    };

    // Send settings back to Pebble
    var url = returnTo + encodeURIComponent(JSON.stringify(settings));
    document.location = url;
  });

  // Reset button handler
  document.getElementById('reset-button').addEventListener('click', function () {
    if (!confirm('Are you sure you want to reset all settings?')) {
      return;
    }

    // Clear all form fields
    providerSelect.value = defaults.provider;
    apiKeyInput.value = '';
    updateProviderFields();
    document.getElementById('mcp-servers').value = '';

    // Toggle advanced fields visibility
    toggleAdvancedFields();

    // Send empty settings back to Pebble to clear localStorage
    var settings = {
      provider: defaults.provider,
      api_key: '',
      base_url: defaults.base_url,
      model: defaults.model,
      system_message: defaults.system_message,
      web_search_enabled: 'false',
      mcp_servers: ''
    };

    var url = returnTo + encodeURIComponent(JSON.stringify(settings));
    document.location = url;
  });
});