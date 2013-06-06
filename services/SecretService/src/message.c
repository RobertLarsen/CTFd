#include "message.h"
#include <string.h>
#include <ctype.h>
#include <stdio.h>
#include <assert.h>
#include <unistd.h>

typedef enum {
    STATE_OUT = 0,
    STATE_IN_KEY = 1,
    STATE_OUT_KEY = 2,
    STATE_IN_VALUE = 3,
    STATE_IN_VALUE_ESCAPE = 4,
    STATE_END = 5
} MsgParserState;

int message_parser(char * msg, int (*fcn_ptr)(MsgKeyValue*, void*), void * data) {
    char * ptr;
    MsgParserState state = STATE_OUT;
    MsgKeyValue key_value_state;

    if (strstr(msg, "<msg ") != msg) {
        return -1;
    }

    for (ptr = msg + 5; state != STATE_END && *ptr; ptr++) {
        switch(state) {
            case STATE_OUT: 
                if (*ptr != ' ' && *ptr != '/') {
                    key_value_state.key_start = ptr;
                    state = STATE_IN_KEY;
                } else if (*ptr == '/' && ptr[1] == '>') {
                    state = STATE_END;
                }
                break;
            case STATE_IN_KEY:
                if (*ptr == '=') {
                    key_value_state.key_end = ptr;
                    state = STATE_OUT_KEY;
                }
                break;
            case STATE_OUT_KEY:
                if (*ptr == '"') {
                    key_value_state.value_start = ptr + 1;
                    state = STATE_IN_VALUE;
                }
                break;
            case STATE_IN_VALUE:
                if (*ptr == '"') {
                    key_value_state.value_end = ptr;
                    if (fcn_ptr) {
                        fcn_ptr(&key_value_state, data);
                    }
                    state = STATE_OUT;
                } else if (*ptr == '\\') {
                    state = STATE_IN_VALUE_ESCAPE;
                }
                break;
            case STATE_IN_VALUE_ESCAPE:
                state = STATE_IN_VALUE;
                break;
            case STATE_END:
                break;
        }
    }
    return state == STATE_END ? (int)(ptr - msg) + 1 : -1;
}

int msg_end_index(char * msg) {
    return message_parser(msg, NULL, NULL);
}

typedef struct {
    ParseResult result;
    char * key;
    int * value;
} IntParseCallbackData;

static int msg_int_parse_callback(MsgKeyValue * key_value, void * d) {
    char * ptr;
    int sign = 1;
    IntParseCallbackData * data = (IntParseCallbackData *)d;
    int key_len = (int)(key_value->key_end - key_value->key_start);

    if (strlen(data->key) == key_len && strncmp(key_value->key_start, data->key, key_len) == 0) {
        /* We found the key */
        *data->value = 0;
        /* We assume that the value is wellformed but may change our opinion later */
        data->result = PARSE_OK;

        for (ptr = key_value->value_start; ptr < key_value->value_end; ptr++) {
            if (ptr == key_value->value_start && *ptr == '-') {
                sign = -1;
            } else if (isdigit(*ptr)) {
                *data->value *= 10;
                *data->value += (*ptr - '0');
            } else {
                data->result = PARSE_VALUE_MALFORMED;
            }
        }
        *data->value *= sign;
    }
    return data->result == PARSE_KEY_NOT_FOUND;
}

ParseResult msg_parse_int(char * msg, char * key, int * value) {
    IntParseCallbackData data = {PARSE_KEY_NOT_FOUND, key, value};

    if (message_parser(msg, msg_int_parse_callback, &data) < 0) {
        data.result = PARSE_MESSAGE_INCOMPLETE;
    }
    return data.result;
}

int message_test_main(int argc, char ** argv) {
    signed int value;

    /* Message lengths */
    assert(msg_end_index("<msg ") < 0);
    assert(msg_end_index("<msg T=\"1\"/>") == 12);
    assert(msg_end_index("<msg T=\"1\"/><msg T=\"1\"/>") == 12);
    assert(msg_end_index("<msg T=\"a\\\" b\"/>") == 16);

    /* Integer parsing */
    assert(msg_parse_int("<msg KEY=\"987123\"/>", "KEY", &value) == PARSE_OK && value == 987123);
    assert(msg_parse_int("<msg KEY=\"-987123\"/>", "KEY", &value) == PARSE_OK && value == -987123);
    assert(msg_parse_int("<msg KEY=\"-1\"/>", "KEY", &value) == PARSE_OK && value == -1);
    assert(msg_parse_int("<msg KEY=\"-2147483648\"/>", "KEY", &value) == PARSE_OK && value == -2147483648);
    assert(msg_parse_int("<msg KEY=\"2147483647\"/>", "KEY", &value) == PARSE_OK && value == 2147483647);
    assert(msg_parse_int("<msg KEY=\"987123a\"/>", "KEY", &value) == PARSE_VALUE_MALFORMED);
    assert(msg_parse_int("<msg KEY=\"--987123\"/>", "KEY", &value) == PARSE_VALUE_MALFORMED);
    assert(msg_parse_int("<msg NO_KEY=\"987123\"/>", "KEY", &value) == PARSE_KEY_NOT_FOUND);
    assert(msg_parse_int("<msg NO_KEY=\"987123\"/", "KEY", &value) == PARSE_MESSAGE_INCOMPLETE);

    return 0;
}
