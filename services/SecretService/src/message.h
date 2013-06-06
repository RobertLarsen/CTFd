#if !defined(MESSAGE_H)
#define MESSAGE_H

typedef enum {
    PARSE_OK = 0,
    PARSE_MESSAGE_INCOMPLETE = 1,
    PARSE_KEY_NOT_FOUND = 2,
    PARSE_VALUE_MALFORMED = 3
} ParseResult;

typedef struct {
    char * key_start;
    char * key_end;
    char * value_start;
    char * value_end;
} MsgKeyValue;

int msg_end_index(char * msg);
ParseResult msg_parse_int(char * msg, char * key, int * value);
int message_parser(char * msg, int (*fcn_ptr)(MsgKeyValue*, void*), void * data);

#endif
