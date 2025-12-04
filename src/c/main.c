#include <pebble.h>

// Windows
static Window *s_main_window;
static TextLayer *s_title_layer;
static TextLayer *s_status_layer;
static ActionBarLayer *s_action_bar;

// Response window
static Window *s_response_window;
static ScrollLayer *s_scroll_layer;
static TextLayer *s_response_text_layer;

// Icons
static GBitmap *s_mic_icon;

// Response buffer
static char s_response_buffer[512];

// Forward declarations
static void main_window_load(Window *window);
static void main_window_unload(Window *window);
static void response_window_load(Window *window);
static void response_window_unload(Window *window);
static void send_voice_input(void);
static void dictation_session_callback(DictationSession *session, 
                                       DictationSessionStatus status,
                                       char *transcription,
                                       void *context);
static void inbox_received_callback(DictionaryIterator *iterator, void *context);
static void inbox_dropped_callback(AppMessageResult reason, void *context);
static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context);

// Message keys (must match appinfo.json)
#define KEY_QUESTION 0
#define KEY_RESPONSE 1
#define KEY_ERROR 2

// Action bar click handlers
static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  send_voice_input();
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  // Could add history or settings
  text_layer_set_text(s_status_layer, "History");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
}

// Send voice input
static void send_voice_input(void) {
  text_layer_set_text(s_status_layer, "Listening...");
  
  // Show the dictation UI
  DictationSession *session = dictation_session_create(
    sizeof(s_response_buffer),
    dictation_session_callback,
    NULL
  );
  
  dictation_session_start(session);
}

// Dictation callback - called when user finishes speaking
static void dictation_session_callback(DictationSession *session, 
                                       DictationSessionStatus status,
                                       char *transcription,
                                       void *context) {
  if (status == DictationSessionStatusSuccess) {
    text_layer_set_text(s_status_layer, "Processing...");
    
    // Send to phone/cloud
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    dict_write_cstring(iter, KEY_QUESTION, transcription);
    app_message_outbox_send();
    
  } else {
    text_layer_set_text(s_status_layer, "Try again");
  }
  
  dictation_session_destroy(session);
}

// Receive response from phone
static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *response_tuple = dict_find(iterator, KEY_RESPONSE);
  Tuple *error_tuple = dict_find(iterator, KEY_ERROR);
  
  if (response_tuple) {
    snprintf(s_response_buffer, sizeof(s_response_buffer), 
             "%s", response_tuple->value->cstring);
    
    // Show response window
    window_stack_push(s_response_window, true);
    text_layer_set_text(s_response_text_layer, s_response_buffer);
    text_layer_set_text(s_status_layer, "Ready");
    
  } else if (error_tuple) {
    text_layer_set_text(s_status_layer, "Error");
    snprintf(s_response_buffer, sizeof(s_response_buffer), 
             "Error: %s", error_tuple->value->cstring);
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  text_layer_set_text(s_status_layer, "Message dropped");
}

static void outbox_failed_callback(DictionaryIterator *iterator, 
                                   AppMessageResult reason, void *context) {
  text_layer_set_text(s_status_layer, "Send failed");
}

// Main window setup
static void main_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  // Title layer
  s_title_layer = text_layer_create(GRect(0, 20, bounds.size.w - 20, 40));
  text_layer_set_text(s_title_layer, "Pebble AI");
  text_layer_set_font(s_title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_title_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(s_title_layer));
  
  // Status layer
  s_status_layer = text_layer_create(GRect(0, 80, bounds.size.w - 20, 60));
  text_layer_set_text(s_status_layer, "Press SELECT\nto speak");
  text_layer_set_font(s_status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(s_status_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(s_status_layer));
  
  // Action bar
  s_action_bar = action_bar_layer_create();
  action_bar_layer_add_to_window(s_action_bar, window);
  action_bar_layer_set_click_config_provider(s_action_bar, click_config_provider);
  
  // Set icons
  s_mic_icon = gbitmap_create_with_resource(RESOURCE_ID_MIC_ICON);
  action_bar_layer_set_icon(s_action_bar, BUTTON_ID_SELECT, s_mic_icon);
  // If icon fails, the button still works - just no icon displayed
}

static void main_window_unload(Window *window) {
  text_layer_destroy(s_title_layer);
  text_layer_destroy(s_status_layer);
  action_bar_layer_destroy(s_action_bar);
  gbitmap_destroy(s_mic_icon);
}

// Response window setup
static void response_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  // Scroll layer for long responses
  s_scroll_layer = scroll_layer_create(bounds);
  scroll_layer_set_click_config_onto_window(s_scroll_layer, window);
  layer_add_child(window_layer, scroll_layer_get_layer(s_scroll_layer));
  
  // Response text layer
  s_response_text_layer = text_layer_create(GRect(5, 5, bounds.size.w - 10, 2000));
  text_layer_set_text(s_response_text_layer, s_response_buffer);
  text_layer_set_font(s_response_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24));
  
  // Enable text flow and word wrap
  text_layer_set_overflow_mode(s_response_text_layer, GTextOverflowModeWordWrap);
  
  // Set scroll content size
  GSize max_size = text_layer_get_content_size(s_response_text_layer);
  text_layer_set_size(s_response_text_layer, max_size);
  scroll_layer_set_content_size(s_scroll_layer, GSize(bounds.size.w, max_size.h + 10));
  
  scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_response_text_layer));
}

static void response_window_unload(Window *window) {
  text_layer_destroy(s_response_text_layer);
  scroll_layer_destroy(s_scroll_layer);
}

// App initialization
static void init(void) {
  // Create main window
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload,
  });
  window_stack_push(s_main_window, true);
  
  // Create response window
  s_response_window = window_create();
  window_set_window_handlers(s_response_window, (WindowHandlers) {
    .load = response_window_load,
    .unload = response_window_unload,
  });
  
  // Register AppMessage handlers
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  
  // Open AppMessage with larger buffer for responses
  app_message_open(512, 512);
}

static void deinit(void) {
  window_destroy(s_main_window);
  window_destroy(s_response_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
