# 
# This program shows how to call a hash function, and displays debugging information.
# Run with no arguments.
# 
# Copyright (c) 2020 Project Nayuki. (MIT License)
# https://www.nayuki.io/page/cryptographic-primitives-in-plain-python
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
# - The above copyright notice and this permission notice shall be included in
#   all copies or substantial portions of the Software.
# - The Software is provided "as is", without warranty of any kind, express or
#   implied, including but not limited to the warranties of merchantability,
#   fitness for a particular purpose and noninfringement. In no event shall the
#   authors or copyright holders be liable for any claim, damages or other
#   liability, whether in an action of contract, tort or otherwise, arising from,
#   out of or in connection with the Software or the use or other dealings in the
#   Software.
# 

import cryptocommon, md5hash, sha256hash


def main():
	message = "FF00CA9634"
	msgbytelist = cryptocommon.hexstr_to_bytelist(message)
	hashbytelist = md5hash.hash(msgbytelist, printdebug=True)
	hashhexstr = cryptocommon.bytelist_to_hexstr(hashbytelist)
	print(f"Message string (hex): {message}")
	print(f"Message bytelist: {msgbytelist}")
	print(f"Hash bytelist: {hashbytelist}")
	print(f"MD5 hash (hex): {hashhexstr}")
	print()
	print("-" * 100)
	print()
	
	message = "the quick brown fox"
	msgbytelist = cryptocommon.asciistr_to_bytelist(message)
	hashbytelist = sha256hash.hash(msgbytelist, printdebug=True)
	hashhexstr = cryptocommon.bytelist_to_hexstr(hashbytelist)
	print(f'Message string: "{message}"')
	print(f"Message bytelist: {msgbytelist}")
	print(f"Hash bytelist: {hashbytelist}")
	print(f"SHA-256 hash (hex): {hashhexstr}")


if __name__ == "__main__":
	main()
