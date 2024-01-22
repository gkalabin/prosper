import {expect, test} from '@jest/globals';
import {
  Category,
  TEST_ONLY,
  findRoot,
  getDescendants,
  getNameWithAncestors,
  makeCategoryTree,
  sortCategories,
  subtreeIncludes,
} from 'lib/model/Category';

const {getAncestors} = TEST_ONLY;

class CategoryBuilder {
  private state: Category = {
    id: 0,
    name: '',
    displayOrder: 0,
    parentCategoryId: null,
  };

  static new(c: Partial<Category>): CategoryBuilder {
    const b = new CategoryBuilder();
    b.state = {...b.state, ...c};
    return b;
  }

  build(): Category {
    return {...this.state};
  }
}

/**
 * Sample category tree:
 *
 *      Food
 *        > Coffee
 *          > Out
 *          > In
 *        > Restaurants
 *          > Lunch
 *          > Dinner
 *     Bills
 *       > Gas
 *
 * @returns {Category[]} A list of sample categories.
 */
function getSampleCategories() {
  let i = 1;
  const food = CategoryBuilder.new({id: i++, name: 'Food'}).build();
  const foodCoffee = CategoryBuilder.new({
    id: i++,
    name: 'Coffee',
    parentCategoryId: food.id,
  }).build();
  const foodRestaurants = CategoryBuilder.new({
    id: i++,
    name: 'Restaurants',
    parentCategoryId: food.id,
  }).build();
  const foodCoffeeIn = CategoryBuilder.new({
    id: i++,
    name: 'In',
    parentCategoryId: foodCoffee.id,
  }).build();
  const foodCoffeeOut = CategoryBuilder.new({
    id: i++,
    name: 'Out',
    parentCategoryId: foodCoffee.id,
  }).build();
  const foodRestaurantsDinner = CategoryBuilder.new({
    id: i++,
    name: 'Dinner',
    parentCategoryId: foodRestaurants.id,
  }).build();
  const foodRestaurantsLunch = CategoryBuilder.new({
    id: i++,
    name: 'Lunch',
    parentCategoryId: foodRestaurants.id,
  }).build();
  const bills = CategoryBuilder.new({id: i++, name: 'Bills'}).build();
  const billsGas = CategoryBuilder.new({
    id: i++,
    name: 'Gas',
    parentCategoryId: bills.id,
  }).build();
  const sampleCategoriesList = [
    food,
    foodCoffee,
    foodCoffeeOut,
    foodCoffeeIn,
    foodRestaurants,
    foodRestaurantsLunch,
    foodRestaurantsDinner,
    bills,
    billsGas,
  ];
  return {
    food,
    foodCoffee,
    foodCoffeeOut,
    foodCoffeeIn,
    foodRestaurants,
    foodRestaurantsLunch,
    foodRestaurantsDinner,
    bills,
    billsGas,
    sampleCategoriesList,
  };
}

describe('makeCategoryTree', () => {
  test('empty', () => {
    const actual = makeCategoryTree([]);
    expect(actual.tree).toEqual([]);
    expect(actual.nodeLookup.size).toEqual(0);
  });

  test('missing parent', () => {
    const food = CategoryBuilder.new({
      id: 1,
      name: 'Food',
      parentCategoryId: 17,
    }).build();
    expect(() => makeCategoryTree([food])).toThrow('Cannot find parent');
  });

  test('single node', () => {
    const food = CategoryBuilder.new({id: 1, name: 'Food'}).build();
    const actual = makeCategoryTree([food]);
    expect(actual.tree).toEqual([
      {
        category: expect.objectContaining({
          name: 'Food',
        }),
        parent: null,
        children: [],
      },
    ]);
    expect(actual.nodeLookup.size).toEqual(1);
  });

  test('tree with multiple parents', () => {
    const {sampleCategoriesList} = getSampleCategories();
    const actual = makeCategoryTree(sampleCategoriesList);
    expect(actual.tree).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: expect.objectContaining({
            name: 'Food',
          }),
          parent: null,
          children: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                name: 'Restaurants',
              }),
              children: expect.arrayContaining([
                expect.objectContaining({
                  category: expect.objectContaining({
                    name: 'Lunch',
                  }),
                }),
                expect.objectContaining({
                  category: expect.objectContaining({
                    name: 'Dinner',
                  }),
                }),
              ]),
            }),
            expect.objectContaining({
              category: expect.objectContaining({
                name: 'Coffee',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          category: expect.objectContaining({
            name: 'Bills',
          }),
        }),
      ])
    );
    // There are 9 nodes in the tree in total, they all should be in the lookup.
    expect(actual.nodeLookup.size).toEqual(9);
  });
});

describe('getNameWithAncestors', () => {
  test('single node', () => {
    const {food, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getNameWithAncestors(food, tree)).toEqual('Food');
  });
  test('subcategory', () => {
    const {foodCoffee, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getNameWithAncestors(foodCoffee, tree)).toEqual('Food > Coffee');
  });
  test('subsubcategory', () => {
    const {foodCoffeeOut, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getNameWithAncestors(foodCoffeeOut, tree)).toEqual(
      'Food > Coffee > Out'
    );
  });
});

describe('findRoot', () => {
  test('root of a root node is the node itself', () => {
    const {food, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(findRoot(food, tree).name).toEqual('Food');
    expect(findRoot(food.id, tree).name).toEqual('Food');
  });
  test('finding root for a leaf node', () => {
    const {foodRestaurantsLunch, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(findRoot(foodRestaurantsLunch, tree).name).toEqual('Food');
    expect(findRoot(foodRestaurantsLunch.id, tree).name).toEqual('Food');
  });
});

describe('getAncestors', () => {
  test('root has no ancestors', () => {
    const {food, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getAncestors(food, tree)).toEqual([]);
  });
  test('leaf ancestors are found', () => {
    const {foodRestaurantsLunch, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getAncestors(foodRestaurantsLunch, tree)).toMatchObject([
      {category: {name: 'Food'}},
      {category: {name: 'Restaurants'}},
    ]);
  });
});

describe('descendants', () => {
  test('leaf node has no descendants', () => {
    const {foodRestaurantsLunch, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(getDescendants(foodRestaurantsLunch, tree)).toEqual([]);
  });
  test('descendants collects nodes from all the levels underneath', () => {
    const {food, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    const actual = getDescendants(food, tree);
    const byName = (
      a: {category: {name: string}},
      b: {category: {name: string}}
    ) => a.category.name.localeCompare(b.category.name);
    expect(actual.sort(byName)).toMatchObject(
      [
        {category: {name: 'Coffee'}},
        {category: {name: 'In'}},
        {category: {name: 'Out'}},
        {category: {name: 'Restaurants'}},
        {category: {name: 'Lunch'}},
        {category: {name: 'Dinner'}},
      ].sort(byName)
    );
  });
});

describe('subtreeIncludes', () => {
  test('does not include a node from a different tree', () => {
    const {food, bills, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(subtreeIncludes(food, bills, tree)).toBe(false);
  });
  test('does not include parent', () => {
    const {food, foodRestaurants, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(subtreeIncludes(foodRestaurants, food, tree)).toBe(false);
  });
  test('includes itself', () => {
    const {food, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(subtreeIncludes(food, food, tree)).toBe(true);
  });
  test('includes direct child', () => {
    const {food, foodRestaurants, sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(subtreeIncludes(food, foodRestaurants, tree)).toBe(true);
  });
  test('includes far away child', () => {
    const {food, foodRestaurantsLunch, sampleCategoriesList} =
      getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    expect(subtreeIncludes(food, foodRestaurantsLunch, tree)).toBe(true);
  });
});

describe('sortCategories', () => {
  test('empty array', () => {
    expect(sortCategories([])).toEqual([]);
  });
  test('single node', () => {
    const {food} = getSampleCategories();
    expect(sortCategories([food])).toMatchObject([{name: 'Food'}]);
  });
  test('sample tree', () => {
    const {sampleCategoriesList} = getSampleCategories();
    const tree = makeCategoryTree(sampleCategoriesList);
    const actual = sortCategories(sampleCategoriesList).map(c =>
      getNameWithAncestors(c, tree)
    );
    expect(actual).toEqual([
      'Food',
      'Food > Coffee',
      'Food > Coffee > In',
      'Food > Coffee > Out',
      'Food > Restaurants',
      'Food > Restaurants > Dinner',
      'Food > Restaurants > Lunch',
      'Bills',
      'Bills > Gas',
    ]);
  });
  test('with display order overrides', () => {
    const {
      food,
      bills,
      foodCoffeeIn,
      foodRestaurantsLunch,
      foodRestaurantsDinner,
      sampleCategoriesList,
    } = getSampleCategories();
    // Set all display orders to 10000, this won't affect the order as relative display order only matters.
    sampleCategoriesList.forEach(c => (c.displayOrder = 10000));
    // Put Bills first as smaller displayOrder goes first.
    bills.displayOrder = 100;
    food.displayOrder = 200;
    // Check that foodCoffeeIn doesn't go out of order before its parents by setting a low value.
    foodCoffeeIn.displayOrder = 100;
    // Reorder leaf nodes.
    foodRestaurantsLunch.displayOrder = 200;
    foodRestaurantsDinner.displayOrder = 300;
    const tree = makeCategoryTree(sampleCategoriesList);
    const actual = sortCategories(sampleCategoriesList).map(c =>
      getNameWithAncestors(c, tree)
    );
    expect(actual).toEqual([
      'Bills',
      'Bills > Gas',
      'Food',
      'Food > Coffee',
      'Food > Coffee > In',
      'Food > Coffee > Out',
      'Food > Restaurants',
      'Food > Restaurants > Lunch',
      'Food > Restaurants > Dinner',
    ]);
  });
});
