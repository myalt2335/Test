class Lexer {
    constructor(input) {
        this.input = input;
    }

    tokenize() {
        const lines = this.input.split('\n');
        const tokens = [];

        for (let line of lines) {
            line = line.trim();
            if (line === '') {
                continue;
            }

            if (line.toLowerCase().startsWith('note')) {
                continue;
            }

            const inlineCommentMatch = line.match(/\s+note\s+/i);
            if (inlineCommentMatch) {
                const splitIndex = inlineCommentMatch.index;
                line = line.substring(0, splitIndex).trim();
                if (line === '') {
                    continue;
                }
            }

            tokens.push(line);
        }

        return tokens;
    }
}

class Executor {
    constructor() {
        this.variables = {};
        this.functions = {};
        this.output = '';
        this.sleepTime = 1;
        this.intervals = [];
    }

    assignVariable(name, value) {
        this.variables[name] = value;
    }

    getVariable(name) {
        if (this.variables.hasOwnProperty(name)) {
            return this.variables[name];
        } else {
            this.output += `Error: Variable '${name}' is not defined.\n`;
            return 'Undefined';
        }
    }

    parseValue(value) {
        if (!isNaN(value)) {
            return parseInt(value);
        } else if (this.variables.hasOwnProperty(value)) {
            return this.variables[value];
        } else {
            return value;
        }
    }

    performMath(var1, operation, var2) {
        const val1 = this.parseValue(var1);
        const val2 = this.parseValue(var2);

        if (typeof val1 === 'number' && typeof val2 === 'number') {
            switch (operation.toLowerCase()) {
                case 'plus':
                    return val1 + val2;
                case 'minus':
                    return val1 - val2;
                case 'times':
                    return val1 * val2;
                case 'divided by':
                    return val2 !== 0 ? val1 / val2 : 'Error: Division by zero';
                default:
                    return 'Unknown Operation';
            }
        } else {
            return 'Error: Invalid operands for math operation.';
        }
    }

    defineFunction(name, params, body) {
        this.functions[name] = { params, body };
    }

    callFunction(name, args) {
        if (!this.functions.hasOwnProperty(name)) {
            return `Error: Function '${name}' is not defined.`;
        }

        const func = this.functions[name];
        if (args.length !== func.params.length) {
            return `Error: Function '${name}' expects ${func.params.length} arguments.`;
        }

        const localExecutor = new Executor();
        localExecutor.functions = { ...this.functions };

        func.params.forEach((param, index) => {
            localExecutor.assignVariable(param, this.parseValue(args[index]));
        });

        const parser = new Parser(func.body, localExecutor);
        parser.parse();

        return localExecutor.output.trim();
    }

    setSleep(seconds) {
        this.sleepTime = seconds;
    }

    handleInfiniteLoop(message) {
        this.output += `${message}\n`;
        const interval = setInterval(() => {
            this.output += `${message}\n`;
            this.updateOutputDisplay();
        }, this.sleepTime * 1000 || 1000);

        this.intervals.push(interval);
    }

    stopAllLoops() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.output += `\nInfinite loops terminated.\n`;
    }

    updateOutputDisplay() {
        const outputElement = document.getElementById('output');
        outputElement.textContent = this.output;
    }

    cleanup() {
        this.stopAllLoops();
    }
}

class Parser {
    constructor(tokens, executor) {
        this.tokens = tokens;
        this.current = 0;
        this.executor = executor;
    }

    parse() {
        while (this.current < this.tokens.length) {
            const line = this.tokens[this.current];
            if (line.toLowerCase() === 'thats it') {
                this.current++;
                continue;
            }
            this.handleLine(line);
            this.current++;
        }
    }

    handleLine(line) {
        let match = line.match(/^(\w+)\s+is\s+(.+)$/i);
        if (match) {
            const [_, varName, value] = match;
            this.executor.assignVariable(varName, this.executor.parseValue(value));
            return;
        }

        match = line.match(/^Whats\s+(\w+)\?$/i);
        if (match) {
            const varName = match[1];
            const value = this.executor.getVariable(varName);
            this.executor.output += `${value}\n`;
            return;
        }

        match = line.match(/^Whats\s+(\w+)\s+(plus|minus|times|divided by)\s+(\w+)\?$/i);
        if (match) {
            const [_, var1, operation, var2] = match;
            const result = this.executor.performMath(var1, operation, var2);
            this.executor.output += `${result}\n`;
            return;
        }

        match = line.match(/^say\s+(.+)$/i);
        if (match) {
            const message = match[1];
            this.executor.output += `${message}\n`;
            return;
        }

        match = line.match(/^loop\s+through\s+numbers\s+(\w+)\s+to\s+(\w+)$/i);
        if (match) {
            const [_, start, end] = match;
            this.current++;
            this.handleLoop(start, end);
            return;
        }

        match = line.match(/^repeat\s+(.+)\s+forever$/i);
        if (match) {
            const message = match[1];
            this.current++;
            this.handleInfiniteLoop(message);
            return;
        }

        match = line.match(/^if\s+(\w+)\s+is\s+greater\s+than\s+(\w+)$/i);
        if (match) {
            const [_, var1, var2] = match;
            this.current++;
            this.handleConditional(var1, var2);
            return;
        }

        match = line.match(/^(\w+)\s+with\s+numbers\s+(\w+)\s+and\s+(\w+)$/i);
        if (match) {
            const [_, funcName, param1, param2] = match;
            this.current++;
            this.handleFunctionDefinition(funcName, [param1, param2]);
            return;
        }

        match = line.match(/^Whats\s+(\w+)\s+with\s+numbers\s+(\w+)\s+and\s+(\w+)\?$/i);
        if (match) {
            const [_, funcName, arg1, arg2] = match;
            const result = this.executor.callFunction(funcName, [arg1, arg2]);
            this.executor.output += `${result}\n`;
            return;
        }

        match = line.match(/^ask:\s+what\s+is\s+your\s+name\?$/i);
        if (match) {
            const name = prompt("What is your name?");
            this.executor.assignVariable('name', name);
            return;
        }

        match = line.match(/^(\w+)\s+is\s+Whats\s+(\w+)\s+with\s+(\w+)\s+and\s+(\w+)\?$/i);
        if (match) {
            const [_, varName, funcName, arg1, arg2] = match;
            const result = this.executor.callFunction(funcName, [arg1, arg2]);
            this.executor.assignVariable(varName, result);
            return;
        }

        match = line.match(/^but\s+dont\s+say\s+it\s+too\s+fast\s+just\s+every\s+(\d+)\s+seconds$/i);
        if (match) {
            const seconds = parseInt(match[1]);
            this.executor.setSleep(seconds);
            return;
        }

        this.executor.output += `Unrecognized command: ${line}\n`;
    }

    handleLoop(start, end) {
        const startVal = this.executor.parseValue(start);
        const endVal = this.executor.parseValue(end);

        if (typeof startVal !== 'number' || typeof endVal !== 'number') {
            this.executor.output += `Error: Loop bounds must be numbers.\n`;
            return;
        }

        const loopBody = [];
        while (this.current < this.tokens.length) {
            const line = this.tokens[this.current];
            if (line.toLowerCase() === 'thats it') {
                break;
            }
            loopBody.push(line);
            this.current++;
        }

        for (let i = startVal; i <= endVal; i++) {
            this.executor.assignVariable('current', i);
            const localExecutor = new Executor();
            localExecutor.variables = { ...this.executor.variables };
            localExecutor.functions = { ...this.executor.functions };
            const parser = new Parser(loopBody, localExecutor);
            parser.parse();
            this.executor.output += localExecutor.output;
        }
    }

    handleInfiniteLoop(message) {
        let sleepSeconds = this.executor.sleepTime;
        while (this.current < this.tokens.length) {
            const line = this.tokens[this.current];
            if (line.toLowerCase() === 'thats it') {
                break;
            }
            const sleepMatch = line.match(/^but\s+dont\s+say\s+it\s+too\s+fast\s+just\s+every\s+(\d+)\s+seconds$/i);
            if (sleepMatch) {
                sleepSeconds = parseInt(sleepMatch[1]);
                this.executor.setSleep(sleepSeconds);
            }
            this.current++;
        }

        this.executor.handleInfiniteLoop(message);
    }

    handleConditional(var1, var2) {
        const val1 = this.executor.getVariable(var1);
        const val2 = this.executor.getVariable(var2);

        if (typeof val1 !== 'number' || typeof val2 !== 'number') {
            this.executor.output += `Error: Conditional variables must be numbers.\n`;
            return;
        }

        const ifBody = [];
        const elseBody = [];
        let inElse = false;

        while (this.current < this.tokens.length) {
            const line = this.tokens[this.current];
            if (line.toLowerCase() === 'thats it') {
                break;
            }

            const elseMatch = line.match(/^or\s+if\s+not$/i);
            if (elseMatch) {
                inElse = true;
                this.current++;
                continue;
            }

            if (inElse) {
                elseBody.push(line);
            } else {
                ifBody.push(line);
            }

            this.current++;
        }

        if (val1 > val2) {
            const localExecutor = new Executor();
            localExecutor.variables = { ...this.executor.variables };
            localExecutor.functions = { ...this.executor.functions };
            const parser = new Parser(ifBody, localExecutor);
            parser.parse();
            this.executor.output += localExecutor.output;
        } else {
            if (elseBody.length > 0) {
                const localExecutor = new Executor();
                localExecutor.variables = { ...this.executor.variables };
                localExecutor.functions = { ...this.executor.functions };
                const parser = new Parser(elseBody, localExecutor);
                parser.parse();
                this.executor.output += localExecutor.output;
            }
        }
    }

    handleFunctionDefinition(funcName, params) {
        const functionBody = [];

        while (this.current < this.tokens.length) {
            const line = this.tokens[this.current];
            if (line.toLowerCase() === 'thats it') {
                break;
            }
            functionBody.push(line);
            this.current++;
        }

        this.executor.defineFunction(funcName, params, functionBody);
    }
}

let globalExecutor = null;

function runInterpreter() {
    if (globalExecutor) {
        globalExecutor.cleanup();
    }

    globalExecutor = new Executor();
    const executor = globalExecutor;
    executor.output = '';
    document.getElementById('output').textContent = '';

    const code = document.getElementById('code-input').value;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens, executor);
    parser.parse();

    document.getElementById('output').textContent = executor.output;
}

function stopInterpreter() {
    if (globalExecutor) {
        globalExecutor.stopAllLoops();
        document.getElementById('output').textContent = globalExecutor.output;
    }
}

document.getElementById('run-button').addEventListener('click', runInterpreter);
document.getElementById('stop-button').addEventListener('click', stopInterpreter);
