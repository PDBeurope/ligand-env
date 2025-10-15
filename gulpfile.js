const gulp = require('gulp');
const path = require('path');
const del = require('del');
const concat = require('gulp-concat');
const header = require('gulp-header');
const minify = require("gulp-minify");
const cp = require('child_process');

const PACKAGE_ROOT_PATH = process.cwd();
const PKG_JSON = require(path.join(PACKAGE_ROOT_PATH, "package.json"));

const banner = ['/**',
    ` * ${PKG_JSON.name}`,
    ` * @version ${PKG_JSON.version}`,
    ' * @link https://gitlab.ebi.ac.uk/pdbe/web-components/ligand-env',
    ' * @license Apache 2.0',
    ' */',
    ''
].join('\n');

const license = ['/**',
    ' * Copyright 2024-2030 Protein Data Bank in Europe <pdbehelp@ebi.ac.uk>',
    ' * European Bioinformatics Institute (EBI, http://www.ebi.ac.uk/)',
    ' * European Molecular Biology Laboratory (EMBL, http://www.embl.de/)',
    ' * Licensed under the Apache License, Version 2.0 (the "License");',
    ' * you may not use this file except in compliance with the License.',
    ' * You may obtain a copy of the License at ',
    ' * http://www.apache.org/licenses/LICENSE-2.0',
    ' * ',
    ' * Unless required by applicable law or agreed to in writing, software',
    ' * distributed under the License is distributed on an "AS IS" BASIS, ',
    ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
    ' * See the License for the specific language governing permissions and ',
    ' * limitations under the License.',
    ' */',
    ''
].join('\n');


gulp.task('clean', function () {
    return del([`build/${PKG_JSON.name}-component-${PKG_JSON.version}.js`, '!build']);
});

gulp.task('concatCSS', () => {
    return gulp.src(['src/styles/pdb-ligand-env-svg.css'])
        .pipe(concat(`${PKG_JSON.name}-svg.css`))
        .pipe(header(license, {}))
        .pipe(header(banner, {}))
        .pipe(gulp.dest('build/'));
});

gulp.task('copyIndex', () => {
    return gulp.src(['dependencies/index.html'])
        .pipe(concat(`index.html`))
        .pipe(gulp.dest('build/'));
});

gulp.task('copyAppCSS', () => {
    return gulp.src(['src/styles/pdb-ligand-env.css'])
        .pipe(concat(`pdb-ligand-env.css`))
        .pipe(gulp.dest('build/'));
});

gulp.task('copyMapping', () => {
    return gulp.src(['dependencies/het_mapping.json'])
        .pipe(concat(`het_mapping.json`))
        .pipe(gulp.dest('build/'));
});

gulp.task('copyXML', () => {
    return gulp.src(['dependencies/pdb-snfg-visuals.xml'])
        .pipe(concat(`pdb-snfg-visuals.xml`))
        .pipe(gulp.dest('build/'));
});

// gulp.task('concat', () => {
//     return gulp.src([`build/${PKG_JSON.name}-plugin.js`, `build/${PKG_JSON.name}-component-init.js`])
//         .pipe(concat(`${PKG_JSON.name}-component-${PKG_JSON.version}.js`))
//         .pipe(header(license, {}))
//         .pipe(header(banner, {}))
//         .pipe(minify({
//             noSource: true
//         }))
//         .pipe(gulp.dest('build/'));
// });

gulp.task('minifyComponent', () => {
    return gulp.src([`build/${PKG_JSON.name}-component-init.js`])
        .pipe(concat(`${PKG_JSON.name}-component-init.js`))
        .pipe(header(license, {}))
        .pipe(header(banner, {}))
        .pipe(minify({
            noSource: true
        }))
        .pipe(gulp.dest('build/'));
});

gulp.task('minifyPlugin', () => {
    return gulp.src([`build/${PKG_JSON.name}-plugin.js`])
        .pipe(concat(`${PKG_JSON.name}-plugin.js`))
        .pipe(header(license, {}))
        .pipe(header(banner, {}))
        .pipe(minify({
            noSource: true
        }))
        .pipe(gulp.dest('build/'));
});

gulp.task('copyVersioned', () => {
    return gulp.src([
        `build/pdb-ligand-env-plugin-min.js`,
        `build/pdb-ligand-env-component-init-min.js`,
        `build/pdb-ligand-env.css`,
        `build/pdb-ligand-env-svg.css`
    ])
    .pipe(gulp.dest('build/'))
    .on('end', () => {
        const fs = require('fs');
        const path = require('path');
        const version = PKG_JSON.version;

        const rename = (file) => {
            const oldPath = path.join('build', file);
            if (fs.existsSync(oldPath)) {
                const ext = path.extname(file);
                const base = path.basename(file, ext).replace('-init', '');
                const baseBefore = base.includes('min') ? base.replace('min', '') : base;
                const baseAfter = base.includes('min') ? '-min' : '';
                const newName = `${baseBefore}-${version}${baseAfter}${ext}`.replace('--', '-');
                fs.copyFileSync(oldPath, path.join('build', newName));
                console.log(`✓ Copied ${file} → ${newName}`);
            }
        };

        [
            'pdb-ligand-env-plugin-min.js',
            'pdb-ligand-env-component-init-min.js',
            'pdb-ligand-env.css',
            'pdb-ligand-env-svg.css'
        ].forEach(rename);
    });
});

gulp.task('createDoc', function (cb) {
    cp.exec('./node_modules/.bin/jsdoc -c jsdoc.json', function(err, stdout, stderr){
        cb(err);
    })
});

gulp.task('default', gulp.series(
    'clean',
    'copyAppCSS',
    'concatCSS',
    'copyXML',
    'copyIndex',
    'copyMapping',
    'minifyPlugin',
    'minifyComponent',
    'copyVersioned',
    'createDoc'
));