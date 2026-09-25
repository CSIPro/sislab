# Give groups stable professor-period numbers

The legacy frontend labels groups by their position in a list, so labels can change when groups are reordered. The backend will assign a positive group number unique to a professor and academic period, while allowing the professor to provide one explicitly. Automatically assigned numbers advance beyond the highest number used in that scope; deactivated groups do not release their numbers.
