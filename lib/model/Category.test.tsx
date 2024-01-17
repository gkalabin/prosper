import {expect, test} from '@jest/globals';
import {
  Category,
  getNameWithAncestors,
  makeCategoryTree,
} from 'lib/model/Category';

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
  const food = CategoryBuilder.new({id: 1, name: 'Food'}).build();
  const foodCoffee = CategoryBuilder.new({
    id: 2,
    name: 'Coffee',
    parentCategoryId: food.id,
  }).build();
  const foodCoffeeOut = CategoryBuilder.new({
    id: 3,
    name: 'Out',
    parentCategoryId: foodCoffee.id,
  }).build();
  const foodCoffeeIn = CategoryBuilder.new({
    id: 4,
    name: 'In',
    parentCategoryId: foodCoffee.id,
  }).build();
  const foodRestaurants = CategoryBuilder.new({
    id: 5,
    name: 'Restaurants',
    parentCategoryId: food.id,
  }).build();
  const foodRestaurantsLunch = CategoryBuilder.new({
    id: 6,
    name: 'Lunch',
    parentCategoryId: foodRestaurants.id,
  }).build();
  const foodRestaurantsDinner = CategoryBuilder.new({
    id: 7,
    name: 'Dinner',
    parentCategoryId: foodRestaurants.id,
  }).build();
  const bills = CategoryBuilder.new({id: 8, name: 'Bills'}).build();
  const billsGas = CategoryBuilder.new({
    id: 9,
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
    const food = CategoryBuilder.new({id: 1, name: 'Food'}).build();
    const tree = makeCategoryTree([food]);
    expect(getNameWithAncestors(food, tree)).toEqual('Food');
  });
});
