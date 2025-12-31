import Page, {
  generateMetadata as generateMetadataImpl,
} from '@/app/(authenticated)/account/[accountId]/[name]/page';


export function generateMetadata(props: any) {
  return generateMetadataImpl(props);
}

export default Page;
