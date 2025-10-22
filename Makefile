all: checkout build

# Checks out submodules. Run after git clone.
# `git submodule update --init --recursive` looks like it should be
# sufficient, but actually fails to update wasi-sdk (not always but
# most of the time)...
# checkout:

bin:
	mkdir $@

# Builds a docker image with (API of) running on port
# 9000. Run as root, on a Linux machine with docker.
build: bin
	$(MAKE) -C docker

bin.zip: bin
	zip -r $@ $<

clean:
	$(MAKE) -C docker clean
	-rm -rf bin doc

