#ifndef RLMALLOC_H_LC973TFQ
#define RLMALLOC_H_LC973TFQ

#include <unistd.h>
#include <stdio.h>

void * rlmalloc(size_t size);
void rlfree(void * ptr);
void * rlcalloc(size_t nmemb, size_t size);
void * rlrealloc(void * ptr, size_t size);
void rldumpdot(FILE * out);

#endif /* end of include guard: RLMALLOC_H_LC973TFQ */

