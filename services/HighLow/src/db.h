#ifndef DB_5W5IYG98
#define DB_5W5IYG98

#include "protocol.h"
#include <sqlite3.h>

typedef enum {
    AUTH_OK,
    AUTH_BAD,
    AUTH_CREATED
} AuthResult;

sqlite3 * get_db(const char * file);
AuthResult db_auth(sqlite3 * db, User * user);
void db_update_score(sqlite3 * db, User * user);
int db_retrieve_highscore(sqlite3 * db, User * destination, int max_entries);
int db_list_users(sqlite3 * db, User * destination, int first, int max);
int db_num_users(sqlite3 * db);
void db_update_num_games(sqlite3 * db, User * user);
int db_detail_user(sqlite3 * db, User * user);

#endif /* end of include guard: DB_5W5IYG98 */
