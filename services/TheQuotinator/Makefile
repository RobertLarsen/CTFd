CC=gcc
CFLAGS=-ggdb -Wall -c -D_DAEMONIZE -D_PARENT_SUPERVISION
LDFLAGS=
CFILES=$(wildcard src/*.c)
OBJECTS=$(patsubst %.c,%.o,$(CFILES))
EXECUTABLE=quotinator

$(EXECUTABLE): $(OBJECTS)
	$(CC) $(LDFLAGS) -o $@ $<

.PHONY: run
run: $(EXECUTABLE)
	./$(EXECUTABLE) 9999 admin verysecret

%.o: %.c
	$(CC) $(CFLAGS) -o $@ $<

TheQuotinator.tar.gz:
	tar czf $@ --exclude-vcs -C .. TheQuotinator/Makefile TheQuotinator/quotinator-init TheQuotinator/src/main.c
