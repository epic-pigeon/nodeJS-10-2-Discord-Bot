function Token(type, value) {
    this.type = type;
    this.value = value;
    if (this.type === "VALUE_STRING") {
        this.value = this.value.slice(1, -1);
    } else if (this.type === "VALUE_NUMBER") {
        this.value = parseFloat(this.value);
    } else if (this.type === "VALUE_BOOLEAN") {
        this.value = this.value === 'true';
    }
}

function CommandProcessor() {
    let self = this;
    this.commands = [
        {
            name: "say",
            description: "Writes down all the arguments given",
            adminOnly: false,
            usage: "-say 'arg1' 'arg2' ...",
            action: function (msg, arguments) {
                arguments.forEach(arg => {msg.reply(arg.value)});
            }
        },
        {
            name: "add_command",
            description: "Creates a command",
            adminOnly: true,
            usage: "-add_command 'name' 'description' 'usage' 'admin only? true : false' 'msg' 'arguments' 'function body'",
            action: function (msg, arguments) {
                if (arguments.length >= 3) {
                    let name = arguments.shift().value;
                    let commandNames = [];
                    self.commands.forEach(command => {commandNames.push(command.name)});
                    if (commandNames.includes(name)) throw {message: "Such command already exists!"};
                    let description = arguments.shift().value;
                    let usage = arguments.shift().value;
                    let adminOnly = arguments.shift().value;
                    let functionBody = arguments.pop().value;
                    let functionArguments = [];
                    arguments.forEach(arg => functionArguments.push(arg.value));
                    let action;
                    try {
                        action = new Function(...functionArguments, functionBody);
                    } catch (e) {
                        throw {message: "Invalid function"};
                    }
                    self.commands.push({
                        name: name,
                        description: description,
                        usage: usage,
                        adminOnly: adminOnly,
                        action: action
                    });
                    msg.reply('Command "' + name + '" successfully created!');
                } else {
                    throw {message: "Invalid number of arguments"};
                }
            }
        },
        {
            name: "help",
            description: "Helps with understanding commands :)",
            usage: "help ?command",
            adminOnly: false,
            action: function (msg, arguments) {
                if (arguments.length === 0) {
                    let string = 'All commands list:\n\t';
                    let commandNames = [];
                    self.commands.forEach(command => {commandNames.push(command.name)});
                    string += commandNames.join('\n\t');
                    msg.reply(string);
                } else if (arguments.length === 1) {
                    let command = arguments[0].value;
                    let commandObject;
                    self.commands.forEach(comm => {
                        if (comm.name === command.toLowerCase()) commandObject = comm;
                    });
                    if (typeof commandObject === "undefined") throw {message: "Such a command doesn't exist"};
                    let string = "Command name: " + commandObject.name + "\nCommand description: " + commandObject.description + "\nCommand usage: " + commandObject.usage + (commandObject.adminOnly ? "\nAdmin only!" : "");
                    msg.reply(string);
                }
            }
        }
    ];
    this.process = function (command, msg) {
        let rules = [
            {type: "VALUE_NUMBER", regexp: "(\\d+)(\\.\\d+)?"},
            {type: "VALUE_STRING", regexp: "((\"(?:[^\"\\\\]|\\\\.)*\")|('(?:[^'\\\\]|\\\\.)*'))"},
            {type: "VALUE_BOOLEAN", regexp: "(true|false)"}
        ];
        let commandNames = [];
        this.commands.forEach(command => {commandNames.push(command.name)});
        let sortByLength = (a, b) => b.length - a.length;
        commandNames = commandNames.sort(sortByLength);
        rules.push({type: "COMMAND", regexp: "(" + commandNames.join("|") + ")"});
        let toSkip = "([ \\n\\t\\r]+)";
        let tokens = this.lexer(command, rules, toSkip);
        if (tokens[0].type === "COMMAND") {
            let commandToken = tokens[0];
            let commandObject;
            this.commands.forEach(comm => {
                if (comm.name === commandToken.value.toLowerCase()) commandObject = comm;
            });
            if (typeof commandObject === "undefined") throw {message: "wtf"};
            if (!commandObject.adminOnly) {
                tokens.shift();
                commandObject.action(msg, tokens);
            } else {
                if (msg.member.roles.has(msg.guild.roles.find(role => role.name === "Admin").id)) {
                    tokens.shift();
                    commandObject.action(msg, tokens);
                } else throw {message: "Not enough rights!"}
            }
        } else {
            throw {message: "Unrecognized command"};
        }
    };
    this.lexer = function (command, rules, toSkip) {
        let tokens = [];
        toSkip = new RegExp('^' + toSkip, 'i');
        this.position = 0;
        this.buffer = command;
        let skip = () => {
            let result = this.buffer.substring(this.position).match(toSkip);
            if (result) {
                this.position += result[0].length;
            }
        };
        while (this.position < this.buffer.length) {
            skip();
            let finalResult = false, finalRule = false;
            for (let i = 0; i < rules.length; i++) {
                let rule = rules[i];
                let result = new RegExp('^' + rule.regexp).exec(this.buffer.substring(this.position));
                //console.log(new RegExp('^' + rule.regexp), result, this.buffer.substring(this.position));
                if (result) {
                    finalResult = result;
                    finalRule = rule;
                    break;
                }
            }
            if (finalResult) {
                //console.log(finalResult[0], finalRule.type);
                this.position += finalResult[0].length;
                tokens.push(new Token(finalRule.type, finalResult[0]));
            } else {
                throw {message: "Unrecognized token"};
            }
        }
        return tokens;
    }
}

module.exports = CommandProcessor;