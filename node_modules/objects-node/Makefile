##
# Binaries.
##

NODE_BIN := node_modules/.bin

DEPCHECK := $(NODE_BIN)/dependency-check
ESLINT := $(NODE_BIN)/eslint
MOCHA := $(NODE_BIN)/mocha

##
# Files.
##

SRCS := $(shell find lib -type f -name "*.js")
TESTS := $(shell find test/ -type f -name "*.test.js")
ALL := $(SRCS) $(TESTS)

# Install the node module dependencies.
install:
	@npm install

# Auto-fix as much as possible.
fmt: install
	@$(ESLINT) --fix $(ALL)

# Run linter.
lint: install
	@$(ESLINT) $(ALL)

# Checks for unused or missing dependencies.
check-dependencies: install
	@$(DEPCHECK) --missing --unused --no-dev $(DEPCHECK_FLAGS) ./package.json

# Run the unit tests.
test-unit: install
	@$(MOCHA) \
		--reporter spec \
		--bail

# Check everything.
test: lint check-dependencies test-unit

# Phonies.
.PHONY: test lint
