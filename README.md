Rocky is basically an ingredient/pantry database. the idea here is to have something you can use to track stuff you own and have a better idea of what's going perishable and what you need to buy more of.

What it really is, though, is more like a v0 implementation of something like airtable. an open question here is how to pull out stuff like the schema configs out. 


notes for myself

client pulls latest version of doc on bootstrap

client maintains local state for certain kinds of changes
client pushes changes on blur/timeout

how can we tell if our datastructure is dirty?
-- immutable?

still we need to push out data on changes
the default behavior for pouch is to emit the new doc id

if we can cleanly push data out to pouch without a conflict, we don't need to update the local state at all because local state, at least for component being edited is guaranteed to be accurate.

each row is a doc in the db

