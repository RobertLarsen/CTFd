#ifndef DATABASE_ECJ4BNM3
#define DATABASE_ECJ4BNM3

#include <sqlite3.h>

sqlite3 * get_configured_database(const char * file);
void database_put(sqlite3 * db, const char * key, const char * value);
int database_get(sqlite3 * db, const char * key, void(*fnc)(const unsigned char*, void*), void * userdata);
void database_delete(sqlite3 * db, const char * key);
int database_iterate(sqlite3 * db, void(*fnc)(const unsigned char *, const unsigned char*, void*), void * userdata);
int database_rows(sqlite3 * db);

#endif /* end of include guard: DATABASE_ECJ4BNM3 */
