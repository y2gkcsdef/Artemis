# Local Tiles

The viewer can render local XYZ tiles when they are present in this directory and served by the
local tile server.

Optional tile download:

```txt
https://drive.google.com/file/d/17aI2C9i8c9AUCpGnicTi_D5cTGCgX0hr/view?usp=sharing
```

Download and unzip the archive into this `Tiles/` directory. The expected path shape is:

```txt
Tiles/<tile-folder>/{z}/{x}/{y}.png
```

For the reduced cadastre tiles, the folder should be:

```txt
Tiles/Gereduceerd_Kadaster_tiles/
```

After the files are in place, start the tile server from this directory:

```bash
node tile-server.mjs
```

The frontend will automatically request configured local tile layers from:

```txt
http://localhost:8080/<tile-folder>/{z}/{x}/{y}.png
```

The tile archive is large: about 4.5 GB zipped and about 10 GB unzipped. Keep the extracted tile
folders out of Git.
