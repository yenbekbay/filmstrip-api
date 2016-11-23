/* @flow */

import querystring from 'querystring';

import _ from 'lodash/fp';

import type { Torrent } from '../../types';

export type YtsRelease = {
  ytsId: number,
  imdbId: string,
  title: string,
  year: number,
  uploadedAt: Date,
  totalSeeds: number,
  youtubeId: string,
  torrents: Array<Torrent>,
};

const ytsTrackers = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.leechers-paradise.org:6969',
];

const releaseFromRes = ({
  id,
  imdb_code,
  title,
  year,
  yt_trailer_code,
  date_uploaded_unix,
  torrents,
}: {
  id: number,
  imdb_code: string,
  title: string,
  year: number,
  yt_trailer_code: string,
  date_uploaded_unix: number,
  torrents: Array<Object>,
}): YtsRelease => ({
  ytsId: id,
  imdbId: imdb_code,
  title,
  year,
  // eslint-disable-next-line camelcase
  uploadedAt: new Date(date_uploaded_unix * 1000),
  totalSeeds: _.reduce(
    (
      totalSeeds: number,
      { seeds }: { seeds: number },
    ) => totalSeeds + seeds,
    0,
    torrents,
  ),
  youtubeId: yt_trailer_code,
  torrents: torrents.map(({ hash, quality, seeds, peers, size_bytes }: {
    hash: string,
    quality: '720p' | '1080p',
    seeds: number,
    peers: number,
    size_bytes: number,
  }): Torrent => ({
    source: 'YTS',
    size: size_bytes,
    seeds,
    peers,
    quality,
    magnetLink: `magnet:?xt=urn:btih:${hash}&${querystring.stringify({
      dn: title,
      tr: ytsTrackers,
    })}`,
  })),
});

export default releaseFromRes;
