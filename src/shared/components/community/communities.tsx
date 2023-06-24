import {
  editCommunity,
  myAuth,
  myAuthRequired,
  setIsoData,
  showLocal,
} from "@utils/app";
import {
  getPageFromString,
  getQueryParams,
  getQueryString,
  numToSI,
} from "@utils/helpers";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import { Component, linkEvent } from "inferno";
import {
  CommunityResponse,
  GetSiteResponse,
  ListCommunities,
  ListCommunitiesResponse,
  ListingType,
  SortType,
} from "lemmy-js-client";
import { InitialFetchRequest } from "../../interfaces";
import { FirstLoadService, I18NextService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { ListingTypeSelect } from "../common/listing-type-select";
import { Paginator } from "../common/paginator";
import { CommunityLink } from "./community-link";

// export type SortType = "Active" | "Hot" | "New" | "Old" | "TopDay" | "TopWeek" | "TopMonth" | "TopYear" | "TopAll" | "MostComments" | "NewComments" | "TopHour" | "TopSixHour" | "TopTwelveHour";

const communityLimit = 10;

type CommunitiesData = RouteDataResponse<{
  listCommunitiesResponse: ListCommunitiesResponse;
}>;

interface CommunitiesState {
  listCommunitiesResponse: RequestState<ListCommunitiesResponse>;
  siteRes: GetSiteResponse;
  searchText: string;
  isIsomorphic: boolean;
  sortType: SortType;
  sortOrder: SortOrders;
}

interface CommunitiesProps {
  listingType: ListingType;
  page: number;
}

function getListingTypeFromQuery(listingType?: string): ListingType {
  return listingType ? (listingType as ListingType) : "Local";
}

enum SortOrders {
  ASC,
  DESC,
}

export class Communities extends Component<any, CommunitiesState> {
  private isoData = setIsoData<CommunitiesData>(this.context);
  state: CommunitiesState = {
    listCommunitiesResponse: { state: "empty" },
    siteRes: this.isoData.site_res,
    searchText: "",
    isIsomorphic: false,
    sortType: "TopMonth",
    sortOrder: SortOrders.ASC,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { listCommunitiesResponse } = this.isoData.routeData;

      this.state = {
        ...this.state,
        listCommunitiesResponse,
        isIsomorphic: true,
      };
    }
  }

  // sortFunction(i: this) {
  //   return function (a, b) {
  //     switch (i.state.sortOrder) {
  //       case SortOrders.ASC:
  //         return (
  //           (b.counts[i.state.sortType] as number) -
  //           (a.counts[i.state.sortType] as number)
  //         );
  //       case SortOrders.DESC:
  //       default:
  //         return (
  //           (a.counts[i.state.sortType] as number) -
  //           (b.counts[i.state.sortType] as number)
  //         );
  //     }
  //   };
  // }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("communities")} - ${
      this.state.siteRes.site_view.site.name
    }`;
  }

  async handleClickHeader(data: { i: Communities; field: SortType }) {
    data.i.setState({ sortType: data.field });
    data.i.setState({
      sortOrder:
        data.i.state.sortOrder === SortOrders.ASC
          ? SortOrders.DESC
          : SortOrders.ASC,
    });
    await data.i.refetch();
  }

  renderListings() {
    switch (this.state.listCommunitiesResponse.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const { listingType, page } = this.getCommunitiesQueryParams();
        return (
          <div>
            <h1 className="h4">
              {I18NextService.i18n.t("list_of_communities")}
            </h1>
            <div className="row g-2 justify-content-between">
              <div className="col-auto">
                <ListingTypeSelect
                  type_={listingType}
                  showLocal={showLocal(this.isoData)}
                  showSubscribed
                  onChange={this.handleListingTypeChange}
                />
              </div>
              <div className="col-auto">{this.searchForm()}</div>
            </div>

            <div className="table-responsive">
              <table
                id="community_table"
                className="table table-sm table-hover"
              >
                <thead className="pointer">
                  <tr>
                    <th>{I18NextService.i18n.t("name")}</th>
                    <th className="text-end">
                      {I18NextService.i18n.t("subscribers")}
                    </th>
                    <th className="text-end">
                      <button
                        className="btn btn-link p-0"
                        type="button"
                        onClick={linkEvent(
                          {
                            i: this,
                            field: "TopMonth",
                          },
                          this.handleClickHeader
                        )}
                      >
                        {I18NextService.i18n.t("users")} /{" "}
                        {I18NextService.i18n.t("month")}
                      </button>
                    </th>
                    <th className="text-end d-none d-lg-table-cell">
                      {I18NextService.i18n.t("posts")}
                    </th>
                    <th className="text-end d-none d-lg-table-cell">
                      <button
                        className="btn btn-link p-0"
                        type="button"
                        onClick={linkEvent(
                          { i: this, field: "MostComments" },
                          this.handleClickHeader
                        )}
                      >
                        {I18NextService.i18n.t("comments")}
                      </button>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.listCommunitiesResponse.data.communities.map(
                    cv => (
                      <tr key={cv.community.id}>
                        <td className="py-2">
                          <CommunityLink community={cv.community} />
                        </td>
                        <td className="text-end py-2">
                          {numToSI(cv.counts.subscribers)}
                        </td>
                        <td className="text-end py-2">
                          {numToSI(cv.counts.users_active_month)}
                        </td>
                        <td className="text-end d-none d-lg-table-cell py-2">
                          {numToSI(cv.counts.posts)}
                        </td>
                        <td className="text-end d-none d-lg-table-cell py-2">
                          {numToSI(cv.counts.comments)}
                        </td>
                        <td className="text-center py-2">
                          {cv.subscribed == "Subscribed" && (
                            <button
                              className="btn btn-link d-inline-block p-0"
                              onClick={linkEvent(
                                {
                                  i: this,
                                  communityId: cv.community.id,
                                  follow: false,
                                },
                                this.handleFollow
                              )}
                            >
                              {I18NextService.i18n.t("unsubscribe")}
                            </button>
                          )}
                          {cv.subscribed === "NotSubscribed" && (
                            <button
                              className="btn btn-link d-inline-block p-0"
                              onClick={linkEvent(
                                {
                                  i: this,
                                  communityId: cv.community.id,
                                  follow: true,
                                },
                                this.handleFollow
                              )}
                            >
                              {I18NextService.i18n.t("subscribe")}
                            </button>
                          )}
                          {cv.subscribed === "Pending" && (
                            <div className="text-warning d-inline-block">
                              {I18NextService.i18n.t("subscribe_pending")}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <Paginator page={page} onChange={this.handlePageChange} />
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="communities container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.renderListings()}
      </div>
    );
  }

  searchForm() {
    return (
      <form
        className="row mb-2"
        onSubmit={linkEvent(this, this.handleSearchSubmit)}
      >
        <div className="col-auto">
          <input
            type="text"
            id="communities-search"
            className="form-control"
            value={this.state.searchText}
            placeholder={`${I18NextService.i18n.t("search")}...`}
            onInput={linkEvent(this, this.handleSearchChange)}
            required
            minLength={3}
          />
        </div>
        <div className="col-auto">
          <label className="visually-hidden" htmlFor="communities-search">
            {I18NextService.i18n.t("search")}
          </label>
          <button type="submit" className="btn btn-secondary">
            <span>{I18NextService.i18n.t("search")}</span>
          </button>
        </div>
      </form>
    );
  }

  async updateUrl({ listingType, page }: Partial<CommunitiesProps>) {
    const { listingType: urlListingType, page: urlPage } =
      this.getCommunitiesQueryParams();

    const queryParams: QueryParams<CommunitiesProps> = {
      listingType: listingType ?? urlListingType,
      page: (page ?? urlPage)?.toString(),
    };

    this.props.history.push(`/communities${getQueryString(queryParams)}`);

    await this.refetch();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleListingTypeChange(val: ListingType) {
    this.updateUrl({
      listingType: val,
      page: 1,
    });
  }

  handleSearchChange(i: Communities, event: any) {
    i.setState({ searchText: event.target.value });
  }

  handleSearchSubmit(i: Communities, event: any) {
    event.preventDefault();
    const searchParamEncoded = encodeURIComponent(i.state.searchText);
    i.context.router.history.push(`/search?q=${searchParamEncoded}`);
  }

  static async fetchInitialData({
    query: { listingType, page },
    client,
    auth,
  }: InitialFetchRequest<
    QueryParams<CommunitiesProps>
  >): Promise<CommunitiesData> {
    const listCommunitiesForm: ListCommunities = {
      type_: getListingTypeFromQuery(listingType),
      sort: "TopMonth",
      limit: communityLimit,
      page: getPageFromString(page),
      auth: auth,
    };

    return {
      listCommunitiesResponse: await client.listCommunities(
        listCommunitiesForm
      ),
    };
  }

  getCommunitiesQueryParams() {
    return getQueryParams<CommunitiesProps>({
      listingType: getListingTypeFromQuery,
      page: getPageFromString,
    });
  }

  async handleFollow(data: {
    i: Communities;
    communityId: number;
    follow: boolean;
  }) {
    const res = await HttpService.client.followCommunity({
      community_id: data.communityId,
      follow: data.follow,
      auth: myAuthRequired(),
    });
    data.i.findAndUpdateCommunity(res);
  }

  async refetch() {
    this.setState({ listCommunitiesResponse: { state: "loading" } });

    const { listingType, page } = this.getCommunitiesQueryParams();

    this.setState({
      listCommunitiesResponse: await HttpService.client.listCommunities({
        type_: listingType,
        sort: this.state.sortType,
        limit: communityLimit,
        page,
        auth: myAuth(),
      }),
    });

    window.scrollTo(0, 0);
  }

  findAndUpdateCommunity(res: RequestState<CommunityResponse>) {
    this.setState(s => {
      if (
        s.listCommunitiesResponse.state == "success" &&
        res.state == "success"
      ) {
        s.listCommunitiesResponse.data.communities = editCommunity(
          res.data.community_view,
          s.listCommunitiesResponse.data.communities
        );
      }
      return s;
    });
  }
}
