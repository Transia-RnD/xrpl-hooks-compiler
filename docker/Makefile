# must be run as root

MAIN_CONTAINER_TAG?=transia/xrpl-craft-compiler

build: dependencies
	docker build -t $(MAIN_CONTAINER_TAG) .

dependencies: compiler-api

run:
	docker run -p 127.0.0.1:9000:9000/tcp $(MAIN_CONTAINER_TAG):latest

shell:
	docker run -it --entrypoint=/bin/sh $(MAIN_CONTAINER_TAG):latest

compiler-api: ../compiler-api
	cp -LR $< .

clean:
	-rm -rf compiler-api
