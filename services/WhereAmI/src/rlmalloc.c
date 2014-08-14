#include "rlmalloc.h"
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

typedef struct _rl_chunk_t {
    size_t size;
    size_t previous_size;
    struct _rl_chunk_t * next;
    struct _rl_chunk_t * previous;
} __attribute__((packed)) rl_chunk_t;

typedef struct _rl_bucket_t {
    size_t size;
    rl_chunk_t free_list;
    struct _rl_bucket_t * next;
} rl_bucket_t;

static rl_bucket_t * allocate_bucket(size_t size);
static rl_chunk_t * find_usable_chunk(rl_bucket_t * bucket, size_t size);
static rl_bucket_t * rlfind_chunk_bucket(rl_bucket_t * bucket, rl_chunk_t * chunk);
static void rlunlink(rl_chunk_t * chunk);
static void rllink(rl_chunk_t * chunk, rl_bucket_t * bucket);
static rl_chunk_t * rlsplit(rl_chunk_t * chunk, size_t size, rl_bucket_t * bucket);
static void rlfree_chunk(rl_bucket_t * first_bucket, rl_chunk_t * chunk);
static void rlfree_buckets(rl_bucket_t * prev, rl_bucket_t * cur);
static rl_chunk_t * rlallocate_chunk(size_t size);

#define RL_CHUNKSIZE(chunk) ((chunk)->size & ~1)
#define RL_CHUNKFREE(chunk) ((chunk)->size & 1)
#define RL_CHUNKINUSE(chunk) (!((chunk)->size & 1))
#define RL_CHUNKMARKFREE(chunk) ((chunk)->size |= 1)
#define RL_CHUNKMARKINUSE(chunk) ((chunk)->size &= ~1)
#define RL_CHUNKDATA(chunk) (&(chunk)->next)
#define RL_PREVIOUS_CHUNK(chunk) ((rl_chunk_t*)(((char*)chunk) - chunk->previous_size))
#define RL_NEXT_CHUNK(chunk) ((rl_chunk_t*)(((char*)chunk) + RL_CHUNKSIZE(chunk)))
#define RL_FIRST_CHUNK(bucket) ((rl_chunk_t*)(((char*)bucket) + sizeof(rl_bucket_t)))
#define RL_BUCKET_UPPER_BOUND(bucket) (void*)(((char*)bucket) + bucket->size)
#define RL_MIN_BUCKET_SIZE (page_size * 256)
#define RL_CHUNK_HEADER_SIZE (sizeof(size_t) * 2)
#define RL_CHUNK_TAIL_SIZE (sizeof(void*) * 2)
#define RL_DATA_CHUNK(data) (rl_chunk_t*)(((char*)data) - RL_CHUNK_HEADER_SIZE)

static rl_bucket_t * first_bucket = NULL;
static long page_size = 0;
static rl_chunk_t * chunks[10] = {0};

void * rlcalloc(size_t nmemb, size_t size) {
    return rlmalloc(nmemb * size);
}

void * rlmalloc(size_t size) {
    rl_chunk_t * chunk = rlallocate_chunk(size);
    return chunk ? RL_CHUNKDATA(chunk) : NULL;
}

void rlfree(void * ptr) {
    if (ptr) {
        rlfree_chunk(first_bucket, (rl_chunk_t*)(((char*)ptr) - RL_CHUNK_HEADER_SIZE));
        rlfree_buckets(first_bucket, first_bucket->next);
    }
}

void * rlrealloc(void * ptr, size_t size) {
    rl_chunk_t * chunk, * other;
    rl_bucket_t * bucket;

    size += RL_CHUNK_HEADER_SIZE;
    size = (size + 1) & ~1;/* Force even number */
    size = size < sizeof(rl_chunk_t) ? sizeof(rl_chunk_t) : size;
    chunk = RL_DATA_CHUNK(ptr);
    bucket = rlfind_chunk_bucket(first_bucket, chunk);

    if (RL_CHUNKSIZE(chunk) < size) {
        /* Caller wants more */
        other = RL_NEXT_CHUNK(chunk);
        if ((void*)other >= RL_BUCKET_UPPER_BOUND(bucket) || RL_CHUNKINUSE(other) || RL_CHUNKSIZE(chunk) + RL_CHUNKSIZE(other) < size) {
            /* Need to allocate new */
            other = rlallocate_chunk(size - RL_CHUNK_HEADER_SIZE);
            memcpy(RL_CHUNKDATA(other), ptr, chunk->size - RL_CHUNK_HEADER_SIZE);
            rlfree(ptr);
            chunk = other;
        } else {
            /* We can simply extend existing chunk */
            rlunlink(other);
            chunk->size += other->size;
            other = RL_NEXT_CHUNK(chunk);
            if ((void*)other < RL_BUCKET_UPPER_BOUND(bucket)) {
                other->previous_size = chunk->size;
            }
            other = rlsplit(chunk, size, bucket);
            if (other) {
                rlfree_chunk(first_bucket, other);
            }
        }
    } else if (chunk->size > size) {
        /* Caller wants less */
        other = rlsplit(chunk, size, bucket);
        if (other) {
            rllink(other, bucket);
        }
    }

    return RL_CHUNKDATA(chunk);
}

static rl_bucket_t * allocate_bucket(size_t size) {
    rl_bucket_t * bucket = NULL;
    rl_chunk_t * chunk;
    size = size < RL_MIN_BUCKET_SIZE ? RL_MIN_BUCKET_SIZE : size;
    size += sizeof(rl_bucket_t);
    size = (size + page_size - 1) & ~(page_size - 1);

    if ((bucket = mmap(NULL, size, PROT_READ | PROT_WRITE | PROT_EXEC, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0)) == MAP_FAILED) {
        bucket = NULL;
    } else {
        bucket->size = size;
        chunk = RL_FIRST_CHUNK(bucket);
        chunk->size = size - sizeof(rl_bucket_t); 
        RL_CHUNKMARKFREE(chunk);
        bucket->free_list.next = bucket->free_list.previous = chunk;
        chunk->next = chunk->previous = &bucket->free_list;
    }
    return bucket;
}

rl_chunk_t * find_usable_chunk(rl_bucket_t * bucket, size_t size) {
    rl_chunk_t * best_fit = NULL, * current;
    size_t chunk_size;
    if (bucket) {
        for (current = bucket->free_list.next; current != &bucket->free_list; current = current->next) {
            chunk_size = RL_CHUNKSIZE(current);
            if (chunk_size >= size && (best_fit == NULL || (chunk_size < RL_CHUNKSIZE(best_fit)))) {
                best_fit = current;
            }
        }
    }
    return best_fit ? best_fit : bucket ? find_usable_chunk(bucket->next, size) : NULL;
}

void rlunlink(rl_chunk_t * chunk) {
    chunk->previous->next = chunk->next;
    chunk->next->previous = chunk->previous;
    chunk->next = chunk->previous = NULL;
    RL_CHUNKMARKINUSE(chunk);
}

void rllink(rl_chunk_t * chunk, rl_bucket_t * bucket) {
    chunk->next = bucket->free_list.next;
    chunk->previous = &bucket->free_list;
    chunk->next->previous = chunk;
    bucket->free_list.next = chunk;
    RL_CHUNKMARKFREE(chunk);
}

static rl_chunk_t * rlsplit(rl_chunk_t * chunk, size_t size, rl_bucket_t * bucket) {
    rl_chunk_t * sibling = NULL;
    if (RL_CHUNKSIZE(chunk) > size + sizeof(rl_chunk_t)) {
        sibling = (rl_chunk_t*)(((char*)chunk) + size);
        sibling->size = chunk->size - size;
        chunk->size = size;
        sibling->previous_size = chunk->size;
        sibling->next = sibling->previous = NULL;

        /* Update next chunks previous size */
        chunk = RL_NEXT_CHUNK(sibling);
        if ((void*)chunk < RL_BUCKET_UPPER_BOUND(bucket)) {
            chunk->previous_size = sibling->size;
        }
    }
    return sibling;
}

static void rlfree_chunk(rl_bucket_t * bucket, rl_chunk_t * chunk) {
    int i;
    rl_chunk_t * sibling;
    bucket = rlfind_chunk_bucket(bucket, chunk);

    for (i = 0; i < 10; i++) {
        if (chunks[i] == chunk) {
            chunks[i] = NULL;
            break;
        }
    }

    /* Coalesce with previous */
    if (chunk != RL_FIRST_CHUNK(bucket)) {
        sibling = RL_PREVIOUS_CHUNK(chunk);
        if (RL_CHUNKFREE(sibling)) {
            rlunlink(sibling);
            sibling->size += chunk->size;
            chunk = sibling;
        }
    }

    /* Coalesce with next */
    sibling = RL_NEXT_CHUNK(chunk);
    if ((void*)sibling < RL_BUCKET_UPPER_BOUND(bucket)) {
        if (RL_CHUNKFREE(sibling)) {
            rlunlink(sibling);
            chunk->size += RL_CHUNKSIZE(sibling);
        }
    }

    /* Update next chunks information about previous size */
    sibling = RL_NEXT_CHUNK(chunk);
    if ((long)sibling < ((long)bucket) + bucket->size) {
        sibling->previous_size = RL_CHUNKSIZE(chunk);
    }

    /* Link */
    rllink(chunk, bucket);
}

rl_bucket_t * rlfind_chunk_bucket(rl_bucket_t * bucket, rl_chunk_t * chunk) {
    while (bucket) {
        if ((long)chunk > (long)bucket && (long)chunk < ((long)bucket) + bucket->size) {
            break;
        }
        bucket = bucket->next;
    }
    return bucket;
}

void rlfree_buckets(rl_bucket_t * prev, rl_bucket_t * cur) {
    if (cur) {
        if (RL_CHUNKSIZE(cur->free_list.next) == (cur->size - sizeof(rl_bucket_t))) {
            /* All chuncks are free */
            prev->next = cur->next;
            munmap(cur, cur->size);
            rlfree_buckets(prev, prev->next);
        } else {
            rlfree_buckets(cur, cur->next);
        }
    }
}

rl_chunk_t * rlallocate_chunk(size_t size) {
    int i;
    rl_chunk_t * chunk = NULL, * sibling;
    rl_bucket_t * last;
    if (first_bucket == NULL) {
        page_size = sysconf(_SC_PAGESIZE);
        first_bucket = allocate_bucket(RL_MIN_BUCKET_SIZE * 10);
    }

    size = (size + 1) & ~1;/* Do not allow odd numbers */
    size = size < RL_CHUNK_TAIL_SIZE ? RL_CHUNK_TAIL_SIZE : size;
    size += RL_CHUNK_HEADER_SIZE;
    chunk = find_usable_chunk(first_bucket, size);
    if (chunk == NULL) {
        for (last = first_bucket; last->next; last = last->next) { }
        last->next = allocate_bucket(size + RL_CHUNK_HEADER_SIZE + sizeof(rl_bucket_t));
        chunk = find_usable_chunk(last->next, size);
    }

    if (chunk) {
        rlunlink(chunk);
        sibling = rlsplit(chunk, size, rlfind_chunk_bucket(first_bucket, chunk));
        if (sibling) {
            rlfree_chunk(first_bucket, sibling);
        }
    }

    for (i = 0; i < 10; i++) {
        if (chunks[i] == NULL) {
            chunks[i] = chunk;
            break;
        }
    }

    return chunk;
}

#ifdef RLMALLOC_DOT

static void rldumpbuckets(FILE * file, rl_bucket_t * bucket);

void rldumpchunk(FILE * file, rl_chunk_t * chunk) {
    fprintf(file, "\tchunk_%08lx [label=<"
        "<table bgcolor=\"%s\" border=\"1\" cellborder=\"1\" cellspacing=\"0\">"
          "<tr><td port=\"f1\" bgcolor=\"black\"><font color=\"white\">0x%08lx</font></td></tr>"
          "<tr><td>Size: %d</td></tr>"
          "<tr><td port=\"f2\">Next free</td></tr>"
          "<tr><td port=\"f3\">Previous free</td></tr>"
        "</table>>];\n",
        (unsigned long)chunk, /* Node name */
        RL_CHUNKFREE(chunk) ? "green" : "red",
        (unsigned long)chunk, /* Headline */
        RL_CHUNKSIZE(chunk)); /* Size */
}
void rldumpchunks(FILE * file, rl_bucket_t * bucket) {
    rl_chunk_t * cur = RL_FIRST_CHUNK(bucket);
    while ((void*)cur < RL_BUCKET_UPPER_BOUND(bucket)) {
        rldumpchunk(file, cur);
        cur = RL_NEXT_CHUNK(cur);
    }
}

void rldumpbucket(FILE * file, rl_bucket_t * bucket) {
    fprintf(file, "\tbucket_%08lx [label=<"
        "<table border=\"1\" cellborder=\"1\" cellspacing=\"0\">"
          "<tr><td port=\"f1\" bgcolor=\"black\"><font color=\"white\">0x%08lx</font></td></tr>"
          "<tr><td>Size: %d</td></tr>"
          "<tr><td port=\"f2\">Next free</td></tr>"
          "<tr><td port=\"f3\">Previous free</td></tr>"
          "<tr><td port=\"f4\">Next bucket</td></tr>"
        "</table>>];\n",
        (unsigned long)bucket, /* Node name */
        (unsigned long)bucket, /* Headline */
        bucket->size,          /* Size */
    );
     
}

void rldumpbuckets(FILE * file, rl_bucket_t * bucket) {
    if (bucket) {
        rldumpbucket(file, bucket);
        rldumpchunks(file, bucket);
        rldumpbuckets(file, bucket->next);
    }
}

void rldumpbuckets_connections(FILE * file, rl_bucket_t * bucket) {
    if (bucket && bucket->next) {
        fprintf(file, "\tbucket_%08lx:f4 -> bucket_%08lx:f1;\n", (unsigned long)bucket, (unsigned long)bucket->next);
        rldumpbuckets_connections(file, bucket->next);
    }
}

void rldumpchunks_freelist(FILE * file, rl_bucket_t * bucket, rl_chunk_t * chunk) {
    /* Next source */
    if (chunk == &bucket->free_list) {
        fprintf(file, "\tbucket_%08lx:f2 -> ", (unsigned long)bucket);
    } else {
        fprintf(file, "\tchunk_%08lx:f2 -> ", (unsigned long)chunk);
    }

    /* Next destination */
    if (chunk->next == &bucket->free_list) {
        fprintf(file, "bucket_%08lx:f1;\n", (unsigned long)bucket);
    } else {
        fprintf(file, "chunk_%08lx:f1;\n", (unsigned long)chunk->next);
    }

    /* Previous source */
    if (chunk == &bucket->free_list) {
        fprintf(file, "\tbucket_%08lx:f3 -> ", (unsigned long)bucket);
    } else {
        fprintf(file, "\tchunk_%08lx:f3 -> ", (unsigned long)chunk);
    }

    /* Previous destination */
    if (chunk->previous == &bucket->free_list) {
        fprintf(file, "bucket_%08lx:f1;\n", (unsigned long)bucket);
    } else {
        fprintf(file, "chunk_%08lx:f1;\n", (unsigned long)chunk->previous);
    }
}

void rldumpchunks_memoryorder(FILE * file, rl_bucket_t * bucket) {
    rl_chunk_t * chunk, * next;
    chunk = RL_FIRST_CHUNK(bucket);
    fprintf(file, "\tbucket_%08lx:f1 -> chunk_%08lx;\n", (unsigned long)bucket, (unsigned long)chunk);

    for (next = RL_NEXT_CHUNK(chunk); (void*)next < RL_BUCKET_UPPER_BOUND(bucket); chunk = next, next = RL_NEXT_CHUNK(chunk)) {
        fprintf(file, "\tchunk_%08lx:f1 -> chunk_%08lx:f1;\n", (unsigned long)chunk, (unsigned long)next);
    }
}

void rldumpdot(FILE * out) {
    rl_chunk_t * chunk;
    rl_bucket_t * bucket;
    fprintf(out, "digraph rlmalloc {\n");
    fprintf(out, "\tnode [shape=plaintext];\n");
    if (first_bucket) {
        rldumpbuckets(out, first_bucket);
        rldumpbuckets_connections(out, first_bucket);

        /* Dump free list connections */
        bucket = first_bucket;
        while (bucket) {
            chunk = &bucket->free_list;

            do {
                rldumpchunks_freelist(out, bucket, chunk);
                chunk = chunk->next;
            } while (chunk != &bucket->free_list);

            bucket = bucket->next;
        }

        /* Dump memory order connections */
        bucket = first_bucket;
        while (bucket) {
            rldumpchunks_memoryorder(out, bucket);
            bucket = bucket->next;
        }
    }
    fprintf(out, "}\n");
}

#endif
