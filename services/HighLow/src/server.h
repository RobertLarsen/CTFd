#ifndef SERVER_BA1G3VBP
#define SERVER_BA1G3VBP

#include "client.h"
#include <sys/epoll.h>

int handle_server(int epfd, struct epoll_event * evt, Client ** available);
int create_server(unsigned short port);

#endif /* end of include guard: SERVER_BA1G3VBP */
