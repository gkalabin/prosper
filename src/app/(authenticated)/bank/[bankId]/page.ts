import Page, {
  generateMetadata as generateMetadataImpl,
} from '@/app/(authenticated)/bank/[bankId]/[name]/page';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateMetadata(props: any) {
  return generateMetadataImpl(props);
}

export default Page;
