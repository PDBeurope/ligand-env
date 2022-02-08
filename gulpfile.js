const gulp = require('gulp');
const path = require('path');
const del = require('del');
const concat = require('gulp-concat');
const header = require('gulp-header');
const minify = require("gulp-minify");

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
    ' * Copyright 2019-2020 Lukas Pravda <lpravda@ebi.ac.uk>',
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

gulp.task('concat', () => {
    return gulp.src([`build/${PKG_JSON.name}-plugin.js`, `build/${PKG_JSON.name}-component-init.js`])
        .pipe(concat(`${PKG_JSON.name}-component-${PKG_JSON.version}.js`))
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

gulp.task('default', gulp.series('clean', 'copyAppCSS', 'concat', 'concatCSS',
    'copyXML', 'copyIndex', 'copyMapping', 'minifyPlugin'));