const fs = require("fs");
const path = require("path");
const reactDocs = require("react-docgen");

const qwcPluginDir = './qwc2/plugins';
let pluginData = [];

fs.readdirSync(qwcPluginDir).forEach(entry => {
    if (entry.endsWith(".jsx")) {
        const file = path.resolve(qwcPluginDir, entry);
        const contents = fs.readFileSync(file);
        pluginData.push(reactDocs.parse(contents, reactDocs.resolver.findAllComponentDefinitions));
    }
});
pluginData = pluginData.flat();

function parsePropType(type) {
    if (type.name === 'shape') {
        return '{\n' +
                Object.entries(type.value).map(([key, value]) => { return '  ' + key + ": " + parsePropType(value) + ',\n'; }).join('') +
                '}';
    } else if (type.name === 'arrayOf') {
        return '[' + parsePropType(type.value) + "]";
    } else if (type.name === 'union') {
        return '{' + type.value.map(entry => parsePropType(entry)).join(", ") + '}';
    } else {
        return type.name;
    }
}

// Write markdown output
let output = "";
output += "Plugin reference\n";
output += "================\n";
output += "\n";

pluginData.forEach(plugin => {
    output += `* [${plugin.displayName}](#${plugin.displayName.toLowerCase()})\n`;
});
output += "\n";
output += "---\n";
pluginData.forEach(plugin => {
    output += `${plugin.displayName}\n`;
    output += "----------------------------------------------------------------\n";
    output += plugin.description + "\n";
    output += "\n";
    output += "| Property | Type | Description | Default value |\n";
    output += "|----------|------|-------------|---------------|\n";
    let documentedProps = 0;
    Object.entries(plugin.props || {}).forEach(([name, prop]) => {
        if (!prop.description) {
            return;
        }
        ++documentedProps;
        const defaultValue = prop.defaultValue ? prop.defaultValue.value.split("\n").map(x => '`' + x.replace(' ', ' ') + '`').join("<br />") : "`undefined`";
        const type = "`" + parsePropType(prop.type).replaceAll(' ', ' ').replaceAll("\n", "`<br />`") + "`";
        output += `| ${name} | ${type} | ${prop.description} | ${defaultValue} |\n`;
    });
    if (documentedProps === 0) {
        output += "|\n";
    }
    output += "\n";
});

fs.writeFileSync('./doc/src/plugins.md', output);
console.log("Plugin documentation written to doc/src/plugins.md!");
