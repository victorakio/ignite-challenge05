import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  navigation: {
    previousPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
  preview: boolean;
}

export default function Post({ post, navigation, preview }: PostProps) {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const isPostEdited =
    post.first_publication_date !== post.last_publication_date;

  return (
    <>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt="imagem" />
        <article>
          <h1>{post.data.title}</h1>

          <div className={styles.postDate}>
            <p>
              <FiCalendar />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </p>
            <p>
              <FiUser />
              {post.data.author}
            </p>
            <p>
              <FiClock />
              {`${readTime} min`}
            </p>
          </div>

          <p>
            <i>
              {isPostEdited &&
                format(
                  new Date(post.last_publication_date),
                  "'* editado em' dd MMM yyyy', às' HH':'mm",
                  {
                    locale: ptBR,
                  }
                )}
            </i>
          </p>

          {post.data.content.map(content => {
            return (
              <>
                <h2 className={styles.heading} key={content.heading}>
                  {content.heading}
                </h2>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </>
            );
          })}
        </article>

        <hr />

        <div className={styles.postNavigation}>
          {navigation?.previousPost.length > 0 && (
            <Link href={`/post/${navigation.previousPost[0].uid}`}>
              <a>
                <p>{navigation.previousPost[0].data.title}</p>
                <p>Post anterior</p>
              </a>
            </Link>
          )}

          {navigation?.nextPost.length > 0 && (
            <Link href={`/post/${navigation.nextPost[0].uid}`}>
              <a>
                <p>{navigation.nextPost[0].data.title}</p>
                <p>Próximo post</p>
              </a>
            </Link>
          )}
        </div>

        <Comments />

        {preview && (
          <button className={commonStyles.exitPreview} type="button">
            <Link href="/api/exit-preview">
              <a>Sair do modo preview</a>
            </Link>
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  // TODO
  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
    fetch: ['post.title', 'post.banner', 'post.author', 'post.content'],
  });
  console.log(response);
  // TODO

  const previousPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  console.log(post);

  return {
    props: {
      post,
      navigation: {
        previousPost: previousPost?.results,
        nextPost: nextPost?.results,
      },
      preview,
    },
  };
};
