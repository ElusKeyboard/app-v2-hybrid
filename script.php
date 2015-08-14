<?php

const ESC = "\x1b";

echo ESC."@";
echo "HELLO WORLD.\n";
echo ESC."d".chr(1);

echo "V\x41".chr(3);