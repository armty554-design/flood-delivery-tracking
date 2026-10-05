const fs = require('fs');
const path = require('path');

const initialData = fs.readFileSync(path.join(__dirname, 'initial_data.json'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'Index_template.html'), 'utf8');

const result = template.replace('/*INITIAL_DATA_PLACEHOLDER*/', initialData);

fs.writeFileSync(path.join(__dirname, 'Index.html'), result, 'utf8');
console.log('Successfully generated Index.html! File size:', fs.statSync(path.join(__dirname, 'Index.html')).size, 'bytes');
