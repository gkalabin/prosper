import {FiltersFormSchema} from '@/components/transactions/filters/FiltersFormSchema';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {Tag} from '@/lib/model/Tag';
import {notEmpty} from '@/lib/util/util';
import {format} from 'date-fns';
import {useEffect, useMemo} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function UpdateQueryOnFormChange() {
  const {tags} = useCoreDataContext();
  const {setValue} = useFormContext<FiltersFormSchema>();
  const [
    transactionTypes,
    vendor,
    accountIds,
    categoryIds,
    tripNames,
    timeFrom,
    timeTo,
    tagIds,
    allTagsShouldMatch,
  ] = useWatch({
    name: [
      'transactionTypes',
      'vendor',
      'accountIds',
      'categoryIds',
      'tripNames',
      'timeFrom',
      'timeTo',
      'tagIds',
      'allTagsShouldMatch',
    ],
    exact: true,
  });
  // Memoize the generated query to prevent unnecessary recalculations
  const generatedQuery = useMemo(() => {
    return generateQuery({
      formValues: {
        transactionTypes,
        vendor,
        accountIds,
        categoryIds,
        tripNames,
        timeFrom,
        timeTo,
        tagIds,
        allTagsShouldMatch,
      },
      tags,
    });
  }, [
    transactionTypes,
    vendor,
    accountIds,
    categoryIds,
    tripNames,
    timeFrom,
    timeTo,
    tagIds,
    allTagsShouldMatch,
    tags,
  ]);
  // update query input with the generated query when any of the other fields change
  useEffect(() => {
    setValue('query', generatedQuery);
  }, [generatedQuery, setValue]);
  return null;
}

function generateQuery({
  formValues,
  tags,
}: {
  formValues: Omit<FiltersFormSchema, 'query'>;
  tags: Tag[];
}) {
  const {
    transactionTypes,
    vendor,
    accountIds,
    categoryIds,
    tripNames,
    timeFrom,
    timeTo,
    tagIds,
    allTagsShouldMatch,
  } = formValues;
  const parts: string[] = [];
  const appendOR = (...or: (string | undefined)[]) => {
    const values = or.filter(notEmpty).filter(x => x.trim().length > 0);
    if (values.length > 1) {
      parts.push(`(${values.join(' OR ')})`);
    } else {
      parts.push(...values);
    }
  };
  appendOR(...transactionTypes.map(tt => `t:${tt}`));
  appendOR(vendor && `vendor:${vendor}`);
  appendOR(...accountIds.map(id => `account:${id}`));
  appendOR(...categoryIds.map(id => `c:${id}`));
  appendOR(...tripNames.map(t => `trip:${t}`));
  appendOR(timeFrom && `date>=${format(new Date(timeFrom), 'yyyy-MM-dd')}`);
  appendOR(timeTo && `date<=${format(new Date(timeTo), 'yyyy-MM-dd')}`);
  if (tagIds.length > 0) {
    const tagSet = new Set(tagIds);
    const selectedTags = tags.filter(t => tagSet.has(t.id));
    const tagParts = selectedTags.map(t => `tag:${t.name}`);
    if (tagParts.length > 1 && !allTagsShouldMatch) {
      parts.push(`(${tagParts.join(' OR ')})`);
    } else {
      parts.push(...tagParts);
    }
  }
  return parts.join(' ');
}
