// write a function which given 4 numbers A B C D returns the number of valid times
//that can be display on a digital clock
function validTime(a, b, c, d) {
	var count = 0;
	for (var i = 0; i < 24; i++) {
		for (var j = 0; j < 60; j++) {
			if (a * 10 + b == i && c * 10 + d == j) {
				count++;
			}
		}
	}
	return count;
}

console.log(validTime(1, 8, 3, 2));
