/**
 * Curated field selections. Keeping queries narrow avoids the
 * "Too much data selected" error and the server-side 3s execution cap.
 */

export const VN_CARD =
  'title,alttitle,released,image{url,thumbnail,dims,sexual,violence},rating,votecount,average,length,length_minutes,olang,languages,platforms,devstatus';

export const VN_ROW = `${VN_CARD},developers{name},tags{id,rating,spoiler,lie}`;

export const VN_DETAIL = [
  'title',
  'alttitle',
  'titles{lang,title,latin,official,main}',
  'aliases',
  'olang',
  'devstatus',
  'released',
  'languages',
  'platforms',
  'image{url,thumbnail,dims,sexual,violence}',
  'length',
  'length_minutes',
  'length_votes',
  'description',
  'average',
  'rating',
  'votecount',
  'screenshots{id,url,dims,thumbnail,thumbnail_dims,sexual,violence,release{id}}',
  'relations{id,relation,relation_official,title,released,rating,votecount,image{url,thumbnail,sexual,violence}}',
  'tags{id,name,rating,spoiler,lie,category}',
  'developers{id,name,original,type}',
  'editions{eid,lang,name,official}',
  'staff{eid,role,note,id,aid,name}',
  'va{note,staff{id,aid,name},character{id,name}}',
  'extlinks{url,label,name}'
].join(',');

export const CHARACTER_DETAIL = [
  'name',
  'original',
  'aliases',
  'description',
  'image{url,dims,sexual,violence}',
  'blood_type',
  'height',
  'weight',
  'bust',
  'waist',
  'hips',
  'cup',
  'age',
  'birthday',
  'sex',
  'gender',
  'vns{id,spoiler,role,title,released,rating,image{url,thumbnail,sexual,violence}}',
  'traits{id,name,group_name,spoiler,lie}'
].join(',');

export const CHARACTER_CARD = 'name,original,image{url,dims,sexual,violence},sex,blood_type,height,weight,age,vns{id,role}';

export const RELEASE_DETAIL = [
  'title',
  'alttitle',
  'languages{lang,title,latin,mtl,main}',
  'platforms',
  'media{medium,qty}',
  'vns{id,rtype,title,rating,image{url,thumbnail,sexual,violence}}',
  'producers{id,name,developer,publisher,type}',
  'images{url,thumbnail,type,photo,languages,sexual,violence,dims}',
  'released',
  'minage',
  'patch',
  'freeware',
  'uncensored',
  'official',
  'has_ero',
  'resolution',
  'engine',
  'voiced',
  'notes',
  'gtin',
  'catalog',
  'extlinks{url,label,name}'
].join(',');

export const RELEASE_CARD =
  'title,released,languages{lang,main},platforms,media{medium,qty},minage,official,patch,freeware,uncensored,producers{id,name,developer,publisher},vns{id,rtype,title,rating},images{url,thumbnail,thumbnail_dims,type,sexual,violence},engine,voiced,resolution,has_ero';

export const PRODUCER_DETAIL = 'name,original,aliases,lang,type,description,extlinks{url,label,name}';
export const PRODUCER_CARD = 'name,original,lang,type';

export const STAFF_DETAIL = 'name,original,lang,gender,description,aliases{aid,name,latin,ismain},extlinks{url,label,name}';
export const STAFF_CARD = 'name,original,lang,gender';

export const TAG_DETAIL = 'name,aliases,description,category,searchable,applicable,vn_count';
export const TAG_CARD = 'name,category,vn_count,searchable,applicable';

export const TRAIT_DETAIL = 'name,aliases,description,searchable,applicable,sexual,group_id,group_name,char_count';
export const TRAIT_CARD = 'name,group_name,char_count,sexual';

export const QUOTE_FULL = 'quote,score,vn{id,title},character{id,name}';

export const ULIST_ITEM = [
  'id',
  'added',
  'voted',
  'lastmod',
  'vote',
  'started',
  'finished',
  'notes',
  'labels{id,label}',
  'vn{title,alttitle,released,rating,votecount,length,length_minutes,olang,platforms,image{url,thumbnail,sexual,violence}}',
  'releases{id,list_status,title,released}'
].join(',');
