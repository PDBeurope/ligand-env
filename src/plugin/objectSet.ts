/**
 * Extension class just to get objects and collections work nicely.
 * Not sure what the javascript way is if you need distinct on 
 *
 * @export
 * @class ObjectSet
 * @extends {Set<T>}
 * @template T
 */
class ObjectSet<T> extends Set<T> { 
    
    public tryAdd(value: T): T {
        let item = undefined;

        this.forEach((x: any) => {
            if (x.equals(value)) {
                item = x;
                return;
            }
        });

        if (item === undefined) { 
            item = value;
            super.add(value);
        }

        return item;
    }

}