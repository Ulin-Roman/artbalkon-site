import test from 'node:test';
import assert from 'node:assert/strict';
import {checkMarkup} from './markup-check.mjs';

test('images need an actual source before JavaScript runs',()=>{
 for(const html of ['<img src="/photo.webp" alt="Photo">','<img srcset="/photo.webp 640w" alt="">'])assert.doesNotThrow(()=>checkMarkup(html));
 for(const html of ['<img data-src="/photo.webp" alt="Photo">','<img src="" alt="Photo">'])assert.throws(()=>checkMarkup(html),/needs a non-empty src or srcset/);
 assert.throws(()=>checkMarkup('<img src="/photo.webp">'),/needs an alt attribute/);
});

test('source requirements follow picture and media contexts',()=>{
 assert.doesNotThrow(()=>checkMarkup('<picture><source srcset="/photo.webp 640w"><img src="/photo.jpg" alt="Photo"></picture>'));
 assert.doesNotThrow(()=>checkMarkup('<video preload="none"><source src="/movie.mp4" type="video/mp4"></video>'));
 assert.doesNotThrow(()=>checkMarkup('<video preload="none" data-src="/movie.mp4"></video>'));
 assert.throws(()=>checkMarkup('<video><source data-src="/movie.mp4" type="video/mp4"></video>'),/source in video needs a non-empty src/);
 assert.throws(()=>checkMarkup('<audio><source type="audio/mpeg"></audio>'),/source in audio needs a non-empty src/);
 assert.throws(()=>checkMarkup('<picture><source src="/photo.webp"></picture>'),/source in picture needs a non-empty srcset/);
 assert.throws(()=>checkMarkup('<source src="/movie.mp4">'),/must be a child/);
});

test('dimensions are numeric and iframe borders belong to CSS',()=>{
 assert.doesNotThrow(()=>checkMarkup('<iframe width="640" height="480" title="Map"></iframe>'));
 assert.doesNotThrow(()=>checkMarkup('<iframe title="Map"></iframe>'));
 for(const html of ['<iframe width="100%"></iframe>','<img src="/photo.webp" alt="Photo" height="-1">','<video width="640px"></video>'])assert.throws(()=>checkMarkup(html),/must be a non-negative integer/);
 assert.throws(()=>checkMarkup('<iframe frameborder="0"></iframe>'),/obsolete frameborder/);
});

test('tag-like text in comments, scripts and styles is not media markup',()=>{
 assert.doesNotThrow(()=>checkMarkup('<!-- <img> --><script>const text="<img>";</script><style>.example:after{content:"<img>"}</style><img src="/photo.webp" alt="a > b">'));
});

test('accessible names use roles that support naming',()=>{
 for(const html of ['<div role="group" aria-label="Contacts"></div>','<span role="img" aria-label="Five stars">★★★★★</span>'])assert.doesNotThrow(()=>checkMarkup(html));
 for(const html of ['<div aria-label="Contacts"></div>','<span aria-label="Five stars">★★★★★</span>','<div role="presentation" aria-label="Contacts"></div>'])assert.throws(()=>checkMarkup(html),/needs a nameable role/);
});

test('decorative images, captions and tab panels keep valid HTML semantics',()=>{
 assert.doesNotThrow(()=>checkMarkup('<img src="/background.webp" alt="" aria-hidden="true">'));
 assert.doesNotThrow(()=>checkMarkup('<figure><img src="/photo.webp" alt="Photo"><figcaption>Caption</figcaption></figure>'));
 assert.doesNotThrow(()=>checkMarkup('<div role="tabpanel">Content</div>'));
 assert.throws(()=>checkMarkup('<img src="/background.webp" alt="" role="presentation">'),/implicit decorative role/);
 assert.throws(()=>checkMarkup('<figure><a href="/photo.webp"><figcaption>Caption</figcaption></a></figure>'),/direct child of figure/);
 assert.throws(()=>checkMarkup('<article role="tabpanel">Content</article>'),/cannot have the tabpanel role/);
});
